# Eryxon Flow

A comprehensive manufacturing workflow management system for sheet metal fabrication, built with React, TypeScript, and Supabase.

## Overview

Eryxon Flow is a modern web application designed to streamline manufacturing operations, from job creation to production tracking. It provides real-time visibility into production status, resource allocation, and performance metrics.

## Key Features

- **Job Management**: Create, track, and manage manufacturing jobs with parts and operations
- **Manufacturing Cells**: Configure production cells with visual workflow representation
- **Parts Tracking**: Monitor parts through the production process with status updates
- **3D CAD Viewer**: View STEP/STP files directly in the browser with interactive 3D controls
- **Time Tracking**: Track operation time and operator assignments
- **Issue Management**: Report and resolve production issues in real-time
- **Material UI Design System**: Modern, responsive interface with dark mode support
- **Multi-tenant**: Secure tenant isolation for multiple organizations
- **RESTful API**: Complete CRUD operations with authentication and webhooks

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Material UI v6 + shadcn/ui
- **3D Graphics**: Three.js with occt-import-js for STEP file parsing
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, Edge Functions)
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- npm or bun package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd eryxon-flow
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your Supabase credentials.

4. Start the development server:
```bash
npm run dev
# or
bun run dev
```

The application will be available at `http://localhost:5173`

## Documentation

Comprehensive documentation is available in the [`/docs`](/docs) folder:

- **[API Documentation](/docs/api-documentation.md)** - Complete API reference with all endpoints
- **[3D Viewer](/docs/3d-viewer.md)** - 3D STEP file viewer setup and usage
- **[Material UI Design System](/docs/material-ui-design-system.md)** - UI components and theming guide
- **[Documentation Index](/docs/index.md)** - Complete documentation overview

## Project Structure

```
eryxon-flow/
├── src/
│   ├── components/        # React components
│   │   ├── mui/          # Material UI components
│   │   ├── admin/        # Admin dashboard components
│   │   └── operator/     # Operator dashboard components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # Third-party integrations
│   │   └── supabase/     # Supabase client and types
│   ├── theme/            # Material UI theme configuration
│   └── lib/              # Utility functions
├── supabase/             # Supabase migrations and functions
├── docs/                 # Documentation
└── public/               # Static assets
```

## User Roles

- **Admin**: Full access to job management, parts, operations, and system configuration
- **Operator**: Access to assigned operations, time tracking, and issue reporting

## Database

The application uses Supabase (PostgreSQL) with Row Level Security (RLS) for multi-tenant data isolation. Database migrations are located in `/supabase/migrations/`.

## Deployment

This project is deployed using [Lovable](https://lovable.dev):

1. Push changes to the repository
2. Visit your [Lovable project](https://lovable.dev/projects/aaa3208a-70fb-4eb6-a5eb-5823f025e734)
3. Click Share → Publish

You can also connect a custom domain via Project > Settings > Domains.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting (via ESLint)
- Component-based architecture
- Material UI design system

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## Support

For issues or questions:
- Check the [documentation](/docs)
- Review existing GitHub issues
- Create a new issue with detailed information

## License

[Add your license here]

## Acknowledgments

- Built with [Lovable](https://lovable.dev)
- Powered by [Supabase](https://supabase.com)
- 3D rendering with [Three.js](https://threejs.org)
- UI components from [Material UI](https://mui.com) and [shadcn/ui](https://ui.shadcn.com)
