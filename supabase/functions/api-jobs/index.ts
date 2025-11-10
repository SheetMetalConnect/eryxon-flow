import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobRequest {
  job_number: string;
  customer?: string;
  due_date?: string;
  notes?: string;
  metadata?: Record<string, any>;
  parts: Array<{
    part_number: string;
    material: string;
    quantity?: number;
    parent_part_number?: string;
    file_paths?: string[];
    notes?: string;
    metadata?: Record<string, any>;
    tasks: Array<{
      task_name: string;
      stage_name: string;
      estimated_time: number;
      sequence: number;
      notes?: string;
    }>;
  }>;
}

async function authenticateApiKey(authHeader: string | null, supabase: any) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.substring(7);
  
  if (!apiKey.startsWith('ery_live_') && !apiKey.startsWith('ery_test_')) {
    return null;
  }

  const keyHash = await bcrypt.hash(apiKey, await bcrypt.genSalt(10));
  
  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, tenant_id')
    .eq('active', true);

  if (!keys || keys.length === 0) return null;

  for (const key of keys) {
    const { data: fullKey } = await supabase
      .from('api_keys')
      .select('key_hash, tenant_id')
      .eq('id', key.id)
      .single();

    if (fullKey && await bcrypt.compare(apiKey, fullKey.key_hash)) {
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', key.id);
      
      return fullKey.tenant_id;
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const tenantId = await authenticateApiKey(req.headers.get('authorization'), supabase);
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: JobRequest = await req.json();

    // Validate required fields
    if (!body.job_number || !body.parts || body.parts.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'job_number and parts are required' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicate job number
    const { data: existingJob } = await supabase
      .from('jobs')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('job_number', body.job_number)
      .single();

    if (existingJob) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'DUPLICATE_JOB', message: `Job number ${body.job_number} already exists` }
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate stages exist
    const stageNames = [...new Set(body.parts.flatMap(p => p.tasks.map(t => t.stage_name)))];
    const { data: stages } = await supabase
      .from('stages')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .in('name', stageNames);

    if (!stages || stages.length !== stageNames.length) {
      const foundStages = stages?.map(s => s.name) || [];
      const missingStages = stageNames.filter(s => !foundStages.includes(s));
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_STAGE',
            message: `Stage(s) not found: ${missingStages.join(', ')}`,
            details: { missing_stages: missingStages }
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stageMap = new Map(stages.map(s => [s.name, s.id]));

    // Create job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        tenant_id: tenantId,
        job_number: body.job_number,
        customer: body.customer,
        due_date: body.due_date,
        notes: body.notes,
        metadata: body.metadata,
        status: 'not_started'
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to create job: ${jobError?.message}`);
    }

    // Create parts
    const partsToCreate = body.parts.map(p => ({
      tenant_id: tenantId,
      job_id: job.id,
      part_number: p.part_number,
      material: p.material,
      quantity: p.quantity || 1,
      file_paths: p.file_paths,
      notes: p.notes,
      metadata: p.metadata,
      status: 'not_started'
    }));

    const { data: createdParts, error: partsError } = await supabase
      .from('parts')
      .insert(partsToCreate)
      .select();

    if (partsError || !createdParts) {
      throw new Error(`Failed to create parts: ${partsError?.message}`);
    }

    // Map part numbers to IDs
    const partMap = new Map(createdParts.map(p => [p.part_number, p.id]));

    // Update parent_part_id for parts with parent_part_number
    for (const part of body.parts) {
      if (part.parent_part_number) {
        const parentId = partMap.get(part.parent_part_number);
        const childId = partMap.get(part.part_number);
        if (parentId && childId) {
          await supabase
            .from('parts')
            .update({ parent_part_id: parentId })
            .eq('id', childId);
        }
      }
    }

    // Create tasks
    const tasksToCreate = [];
    for (const part of body.parts) {
      const partId = partMap.get(part.part_number);
      if (!partId) continue;

      for (const task of part.tasks) {
        const stageId = stageMap.get(task.stage_name);
        if (!stageId) continue;

        tasksToCreate.push({
          tenant_id: tenantId,
          part_id: partId,
          stage_id: stageId,
          task_name: task.task_name,
          sequence: task.sequence,
          estimated_time: task.estimated_time,
          notes: task.notes,
          status: 'not_started'
        });
      }
    }

    const { data: createdTasks, error: tasksError } = await supabase
      .from('tasks')
      .insert(tasksToCreate)
      .select();

    if (tasksError) {
      throw new Error(`Failed to create tasks: ${tasksError?.message}`);
    }

    // Build response
    const response = {
      success: true,
      data: {
        job_id: job.id,
        job_number: job.job_number,
        parts: createdParts.map(p => ({
          part_id: p.id,
          part_number: p.part_number,
          tasks: createdTasks?.filter(t => t.part_id === p.id).map(t => ({
            task_id: t.id,
            task_name: t.task_name
          })) || []
        }))
      }
    };

    return new Response(
      JSON.stringify(response),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-jobs:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
