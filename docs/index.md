# Eryxon Flow Documentation

Welcome to the Eryxon Flow documentation. This index provides an overview of all available documentation to help you understand, use, and extend the application.

## Documentation Overview

### [API Documentation](./api-documentation.md)
Complete API reference for the Eryxon Flow backend services.

**Contents:**
- RESTful API endpoints (CRUD operations)
- Authentication and authorization
- Request/response formats
- Error handling and status codes
- Multi-tenancy and security
- Webhooks and event system
- Rate limiting and best practices

**Audience:** Backend developers, integrators, API consumers

**Key Topics:**
- Manufacturing cells API
- Jobs and parts management
- Operations and time tracking
- Issues and assignments
- API key management
- Webhook configuration

---

### [3D Viewer](./3d-viewer.md)
Comprehensive guide to the 3D STEP file viewer feature.

**Contents:**
- Feature overview and capabilities
- Database setup and storage configuration
- Architecture and data flow
- Component reference (STEPViewer, PartDetailModal)
- Usage instructions for administrators
- Security and performance considerations
- Troubleshooting and testing

**Audience:** Developers, administrators, CAD users

**Key Topics:**
- STEP file upload and management
- Interactive 3D controls (orbit, zoom, pan)
- Exploded view and wireframe mode
- Supabase storage bucket setup
- RLS policies for tenant isolation
- Three.js and occt-import-js integration

---

### [Material UI Design System](./material-ui-design-system.md)
Complete design system documentation for the application's UI components.

**Contents:**
- Brand colors and typography
- Theme configuration (light/dark mode)
- Component library reference
- Layout components (AppHeader, MuiLayout)
- Form components (inputs, selects, date pickers)
- Data display (DataTable)
- Dialogs and modals
- Status badges and action buttons
- Toast notifications
- Responsive design guidelines
- Migration guide from shadcn/ui

**Audience:** Frontend developers, UI/UX designers

**Key Topics:**
- Material UI v6 setup with custom branding
- Montserrat typography system
- Pre-built form components with validation
- Advanced DataTable with sorting/filtering
- Reusable action buttons and icon buttons
- Theme provider and dark mode toggle
- Component demo page

---

## Quick Start Guides

### For Developers

1. **Getting Started**
   - Read the main [README](../README.md) for project setup
   - Review the [Material UI Design System](./material-ui-design-system.md) for UI development
   - Check [API Documentation](./api-documentation.md) for backend integration

2. **Setting Up 3D Viewer**
   - Follow [3D Viewer - Database Setup](./3d-viewer.md#database-setup)
   - Review security and storage configuration
   - Test with sample STEP files

3. **Building Features**
   - Use Material UI components from the design system
   - Follow RESTful API patterns
   - Implement proper error handling
   - Ensure multi-tenant data isolation

### For Administrators

1. **API Setup**
   - Generate API keys via [API Key Management](./api-documentation.md#8-api-keys-api-key-generate)
   - Configure webhooks for job events
   - Review security best practices

2. **3D Viewer Setup**
   - Create Supabase storage bucket
   - Configure RLS policies
   - Test file uploads and viewing

### For Integrators

1. **API Integration**
   - Review [API Documentation](./api-documentation.md)
   - Generate test API keys
   - Implement webhook handlers
   - Test all CRUD operations

2. **Data Model**
   - Understand the database schema
   - Review tenant isolation
   - Implement proper error handling

---

## Documentation by Topic

### Backend & API
- [API Documentation](./api-documentation.md)
  - All endpoints and operations
  - Authentication mechanisms
  - Multi-tenancy implementation
  - Webhooks and events

### Frontend & UI
- [Material UI Design System](./material-ui-design-system.md)
  - Component library
  - Theming and styling
  - Responsive design
  - Dark mode support

### Features
- [3D Viewer](./3d-viewer.md)
  - STEP file viewing
  - 3D model interaction
  - File management
  - Storage setup

---

## Common Tasks

### Adding a New Feature
1. Review the [Material UI Design System](./material-ui-design-system.md) for UI components
2. Check [API Documentation](./api-documentation.md) for backend endpoints
3. Follow existing patterns in `/src/components/` and `/src/pages/`
4. Ensure proper tenant isolation and RLS policies

### Customizing the UI
1. Review theme configuration in `/src/theme/theme.ts`
2. Check [Material UI Design System](./material-ui-design-system.md) for component customization
3. Use design tokens (colors, spacing, typography)
4. Test in both light and dark modes

### Integrating External Systems
1. Review [API Documentation](./api-documentation.md) for available endpoints
2. Generate API keys for authentication
3. Set up webhooks for real-time events
4. Implement proper error handling and retry logic

### Uploading CAD Files
1. Read [3D Viewer - Usage](./3d-viewer.md#usage)
2. Ensure storage bucket is configured
3. Verify RLS policies are in place
4. Test with sample STEP files

---

## Additional Resources

### Project Links
- [Main README](../README.md) - Project overview and setup
- [Lovable Project](https://lovable.dev/projects/aaa3208a-70fb-4eb6-a5eb-5823f025e734) - Deployment platform

### External Documentation
- [Supabase Docs](https://supabase.com/docs) - Backend platform
- [Material UI Docs](https://mui.com) - UI framework
- [Three.js Docs](https://threejs.org/docs/) - 3D graphics library
- [React Query Docs](https://tanstack.com/query/latest) - Data fetching

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite
- **UI**: Material UI v6, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **3D Graphics**: Three.js, occt-import-js

---

## Getting Help

If you can't find what you're looking for:

1. **Search this documentation** - Use Ctrl+F to search within pages
2. **Check the README** - See [../README.md](../README.md) for general information
3. **Review code examples** - Look at existing components and pages
4. **Create an issue** - Open a GitHub issue with your question

---

## Documentation Maintenance

This documentation is maintained alongside the codebase. When making changes:

- Update relevant documentation files
- Keep examples current with actual code
- Add new features to this index
- Maintain consistent formatting and structure

**Last Updated:** 2025-01-17
