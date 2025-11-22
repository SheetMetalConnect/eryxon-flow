# AI Chatbot Setup Guide

## Overview

The Eryxon AI Assistant is a chatbot that helps operators quickly find information about their work queue, jobs, parts, and issues using natural language queries.

## Features

- **Natural Language Queries**: Ask questions in plain English
- **Work Queue Information**: "What should I work on next?"
- **Job Details**: "Tell me about Job #1234"
- **Issue Lookup**: "Show me issues on this job"
- **Mobile Friendly**: Works on tablets and phones

## Setup Instructions

### 1. Configure OpenAI API Key

The chatbot uses OpenAI's GPT-4o-mini model. You need to add your OpenAI API key to Supabase:

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add a new secret:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-`)

### 2. Deploy the Chat API Function

Deploy the chat API edge function to Supabase:

```bash
supabase functions deploy api-chat
```

### 3. Test the Chatbot

1. Log in as an operator
2. Navigate to **Work Queue** or **Operator Terminal**
3. Click the floating chat button (bottom-right corner)
4. Try asking:
   - "What should I work on next?"
   - "Show me my tasks"
   - "Tell me about Job #1234"

## How It Works

### Architecture

```
React Chat UI → Supabase Edge Function → OpenAI API → Database Queries
```

1. User types a question in the chat interface
2. Message is sent to `/api-chat` edge function
3. Edge function calls OpenAI with available functions
4. OpenAI determines which function to call (e.g., `fetch_my_tasks`)
5. Edge function executes database query
6. Results are sent back to OpenAI
7. OpenAI formats the response in natural language
8. User sees the formatted answer

### Available Functions

The chatbot currently supports these functions:

- **fetch_my_tasks**: Get current user's assigned operations
- **fetch_job_details**: Get detailed job information
- **fetch_job_issues**: Get issues for a specific job

### Security

- ✅ User authentication via Supabase Auth
- ✅ Tenant isolation (users only see their own data)
- ✅ Role-based access control
- ✅ API key stored securely in Supabase secrets
- ✅ Rate limiting via OpenAI token limits

## Cost Estimation

**Model**: GPT-4o-mini
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens

**Typical Usage**:
- Average query: ~500 input + 200 output tokens
- Cost per query: ~$0.0002 (less than a cent!)
- 1000 queries/month: ~$0.20

Very cost-effective for daily operator use.

## Troubleshooting

### "OpenAI API key not configured" error

- Make sure you've added the `OPENAI_API_KEY` secret in Supabase
- Redeploy the edge function after adding the secret

### Chatbot not responding

- Check browser console for errors
- Verify edge function is deployed: `supabase functions list`
- Check edge function logs: `supabase functions logs api-chat`

### Authentication errors

- Make sure user is logged in
- Check that user has a valid profile with tenant_id

## Future Enhancements

Potential features to add:

- [ ] Voice input for hands-free operation
- [ ] Multi-language support (Spanish, Chinese, etc.)
- [ ] Ability to update job status via chat
- [ ] Ability to report issues via chat
- [ ] Conversation history persistence
- [ ] Quick action buttons (shortcuts)
- [ ] Integration with notifications
- [ ] Proactive suggestions ("You have a job due tomorrow!")

## Files

- **Backend**: `/supabase/functions/api-chat/index.ts`
- **Frontend**: `/src/components/ChatAssistant.tsx`
- **Integration**: Added to WorkQueue and OperatorTerminal pages

## Support

For questions or issues, contact the development team.
