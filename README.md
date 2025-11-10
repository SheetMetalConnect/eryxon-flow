# Eryxon Flow

Manufacturing workflow management system for tracking jobs, parts, tasks, and operator activity.

## Overview

Eryxon Flow is a comprehensive manufacturing management platform that provides:

- **Job Management** - Track manufacturing jobs from creation to completion
- **Part Tracking** - Monitor parts through production stages with assembly hierarchies
- **Task Management** - Assign and track work tasks with time tracking
- **Operator Interface** - Clean, focused view for shop floor operators
- **Admin Dashboard** - Comprehensive management tools for administrators
- **Issue Tracking** - Report and manage quality issues with photo documentation
- **Real-time Updates** - Live synchronization across all users
- **RESTful API** - Complete API for external system integration
- **Webhooks** - Real-time event notifications for automation

## Quick Start

**URL**: https://lovable.dev/projects/aaa3208a-70fb-4eb6-a5eb-5823f025e734

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/aaa3208a-70fb-4eb6-a5eb-5823f025e734) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Features

### For Operators
- **Work Queue** - View assigned tasks filtered by material and production stage
- **Time Tracking** - Start/stop timers for accurate time tracking
- **Issue Reporting** - Report quality issues with photos and severity levels
- **Activity Dashboard** - View personal productivity and completed tasks

### For Administrators
- **Job Creation** - Create jobs with multiple parts and tasks
- **User Management** - Add operators and manage roles
- **Stage Configuration** - Define production stages with color coding
- **Work Assignment** - Assign parts and jobs to operators
- **Issue Queue** - Review and approve/reject reported issues
- **API Management** - Generate and manage API keys for integrations
- **Webhook Configuration** - Set up webhooks for event notifications

### API & Integrations

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

**Endpoints:**
- `POST /api-jobs` - Create jobs with parts and tasks
- `GET /api-jobs` - List jobs with filtering
- `PATCH /api-jobs` - Update job fields
- `GET /api-parts` - List parts with filtering
- `PATCH /api-parts` - Update part fields
- `GET /api-tasks` - List tasks with filtering
- `PATCH /api-tasks` - Update task progress
- `GET /api-stages` - List production stages
- `GET /api-materials` - List available materials
- `POST /api-upload-url` - Get signed URLs for file uploads

**Webhook Events:**
- `job.created` - New job created
- `task.started` - Operator starts task
- `task.completed` - Task marked complete
- `issue.created` - Quality issue reported

## What technologies are used for this project?

This project is built with:

- **Frontend:** React 18 + TypeScript + Vite
- **UI Framework:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Authentication:** Supabase Auth with role-based access
- **Storage:** Supabase Storage for file management
- **Real-time:** Supabase Realtime for live updates

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/aaa3208a-70fb-4eb6-a5eb-5823f025e734) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
