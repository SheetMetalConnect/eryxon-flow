import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'function'
  content: string
  name?: string
}

interface ChatRequest {
  messages: ChatMessage[]
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile for tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, full_name, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const { messages }: ChatRequest = await req.json()

    // Get OpenAI API key from Supabase secrets
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Define available functions for operators
    const functions = [
      {
        name: 'fetch_my_tasks',
        description: 'Get the current user\'s assigned operations/tasks with job and part details',
        parameters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'on_hold', 'completed'],
              description: 'Filter tasks by status (optional)'
            }
          }
        }
      },
      {
        name: 'fetch_job_details',
        description: 'Get detailed information about a specific job including parts, operations, and customer info',
        parameters: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'The job ID or job number to look up'
            }
          },
          required: ['job_id']
        }
      },
      {
        name: 'fetch_job_issues',
        description: 'Get all issues, problems, or NCRs associated with a specific job',
        parameters: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'The job ID to fetch issues for'
            }
          },
          required: ['job_id']
        }
      }
    ]

    // System prompt for the assistant
    const systemPrompt = `You are Eryxon Assistant, a helpful AI for manufacturing operators using the Eryxon Flow system.

Current user: ${profile.full_name} (${profile.role})

Your role:
- Help operators find information about their work assignments, jobs, parts, and issues
- Provide concise, clear answers focused on what operators need to know
- Format responses with bullet points and clear structure
- Always be helpful and professional

Guidelines:
- Keep responses brief and actionable
- Use job numbers (e.g., "Job #1234") when referring to jobs
- Highlight important info like priorities, due dates, and issues
- If you don't have enough info, ask the user to clarify`

    // Add system message
    const messagesWithSystem = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messagesWithSystem,
        functions: functions,
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    const openaiData = await openaiResponse.json()

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', openaiData)
      return new Response(
        JSON.stringify({ error: 'Failed to get response from AI', details: openaiData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const assistantMessage = openaiData.choices[0].message

    // Check if function call is needed
    if (assistantMessage.function_call) {
      const functionName = assistantMessage.function_call.name
      const functionArgs = JSON.parse(assistantMessage.function_call.arguments)

      let functionResult: any = null

      // Execute the function
      if (functionName === 'fetch_my_tasks') {
        const { status } = functionArgs

        let query = supabase
          .from('operations')
          .select(`
            id,
            operation_name,
            sequence,
            status,
            estimated_hours,
            actual_hours,
            started_at,
            completed_at,
            part:parts!inner(
              id,
              part_number,
              material,
              quantity,
              status,
              job:jobs!inner(
                id,
                job_number,
                customer,
                due_date,
                priority,
                status
              )
            ),
            cell:cells(
              name
            ),
            assignments!inner(
              assignee:profiles!inner(
                id,
                full_name
              )
            )
          `)
          .eq('assignments.assignee.id', user.id)
          .eq('part.job.tenant_id', profile.tenant_id)

        if (status) {
          query = query.eq('status', status)
        } else {
          // Default to pending and in_progress
          query = query.in('status', ['pending', 'in_progress'])
        }

        const { data, error } = await query.order('part.job.priority', { ascending: false })

        if (error) {
          functionResult = { error: error.message }
        } else {
          functionResult = {
            tasks: data?.map(op => ({
              operation_id: op.id,
              operation_name: op.operation_name,
              status: op.status,
              cell: op.cell?.name,
              estimated_hours: op.estimated_hours,
              part_number: op.part?.part_number,
              material: op.part?.material,
              quantity: op.part?.quantity,
              job_number: op.part?.job?.job_number,
              customer: op.part?.job?.customer,
              due_date: op.part?.job?.due_date,
              priority: op.part?.job?.priority,
              job_status: op.part?.job?.status,
            })) || []
          }
        }
      } else if (functionName === 'fetch_job_details') {
        const { job_id } = functionArgs

        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .select(`
            id,
            job_number,
            customer,
            customer_po,
            due_date,
            priority,
            status,
            notes,
            metadata,
            parts(
              id,
              part_number,
              material,
              quantity,
              status,
              notes,
              file_paths,
              operations(
                id,
                operation_name,
                sequence,
                status,
                estimated_hours,
                actual_hours,
                cell:cells(name)
              )
            )
          `)
          .eq('tenant_id', profile.tenant_id)
          .or(`id.eq.${job_id},job_number.eq.${job_id}`)
          .single()

        if (jobError) {
          functionResult = { error: jobError.message }
        } else {
          functionResult = job
        }
      } else if (functionName === 'fetch_job_issues') {
        const { job_id } = functionArgs

        const { data: issues, error: issuesError } = await supabase
          .from('issues')
          .select(`
            id,
            title,
            description,
            severity,
            status,
            ncr_category,
            disposition,
            root_cause,
            created_at,
            reported_by:profiles!issues_reported_by_fkey(full_name),
            part:parts!inner(
              part_number,
              job:jobs!inner(id, job_number)
            )
          `)
          .eq('part.job.tenant_id', profile.tenant_id)
          .or(`part.job.id.eq.${job_id},part.job.job_number.eq.${job_id}`)

        if (issuesError) {
          functionResult = { error: issuesError.message }
        } else {
          functionResult = { issues: issues || [] }
        }
      }

      // Call OpenAI again with function result
      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            ...messagesWithSystem,
            assistantMessage,
            {
              role: 'function',
              name: functionName,
              content: JSON.stringify(functionResult),
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      })

      const followUpData = await followUpResponse.json()

      return new Response(
        JSON.stringify({
          message: followUpData.choices[0].message,
          function_called: functionName,
          function_result: functionResult
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No function call, return direct response
    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
