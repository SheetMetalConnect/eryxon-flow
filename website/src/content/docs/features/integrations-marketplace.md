---
title: "Integrations Marketplace"
description: "Discover, install, and manage pre-built integrations for ERP and business tools."
---

The Integrations Marketplace is a feature that allows users to discover, install, and manage pre-built integrations for common ERP systems and other business tools. Users can also access starter kits to build their own custom integrations.

## Features

### For End Users
- **Browse Integrations**: View a catalog of available integrations with filtering and search capabilities
- **Integration Details**: View detailed information about each integration including:
  - Features and capabilities
  - Supported systems
  - Requirements
  - Setup instructions
  - Documentation and resources
  - GitHub starter kits
- **Install/Uninstall**: Easy one-click installation and removal of integrations
- **Ratings & Reviews**: See community feedback and ratings
- **Installed Tab**: View and manage currently installed integrations

### For Partners/Developers
- **Integration Catalog**: Global catalog of integrations managed centrally
- **Multi-tenant Support**: Each tenant can independently install/configure integrations
- **Custom Integrations**: Starter kits provided for building custom integrations
- **Versioning**: Track integration versions
- **Usage Analytics**: Installation counts and usage statistics

## Implementation

### Database Schema

The marketplace uses three main tables:

1. **`integrations`**: Global catalog of available integrations
   - Basic info (name, description, category, provider)
   - Visual assets (logo, banner, screenshots)
   - Documentation links (docs, GitHub, demo videos)
   - Pricing information
   - Ratings and install counts
   - Status (draft/published/deprecated/archived)

2. **`installed_integrations`**: Tenant-specific installations
   - Links tenant to integration
   - Stores configuration
   - References API keys and webhooks
   - Tracks installation status and last sync

3. **`integration_reviews`**: User ratings and reviews
   - Star ratings (1-5)
   - Review text
   - One review per tenant per integration

### Backend API

**Endpoint**: `/functions/v1/api-integrations`

**Methods**:
- `GET /` - List all published integrations (with filters)
  - Query params: `category`, `search`, `sort`
- `GET /:id` - Get specific integration details
- `GET /installed` - List tenant's installed integrations
- `POST /:id/install` - Install integration (admin only)
- `DELETE /:id/uninstall` - Uninstall integration (admin only)

### Frontend Components

1. **IntegrationsMarketplace** (`src/pages/admin/IntegrationsMarketplace.tsx`)
   - Main marketplace page
   - Tabbed interface (Marketplace / Installed)
   - Search, filter, and sort functionality
   - Integration cards with key info
   - Integration detail modal

2. **IntegrationDetailModal** (`src/components/admin/IntegrationDetailModal.tsx`)
   - Detailed view of integration
   - Tabbed sections (Overview / Features / Setup / Resources)
   - Markdown support for long descriptions
   - Install/uninstall actions
   - Links to documentation and resources

### Navigation

- **Route**: `/admin/integrations`
- **Sidebar**: "App Store" link in bottom navigation section
- **Icon**: Store (shopping bag)

## Setup Instructions

### 1. Apply Database Migration

Apply the migration to create the necessary tables:

```bash
supabase db push
```

Or manually run the migration file:
```bash
supabase db execute -f supabase/migrations/20251117210000_create_integrations_marketplace.sql
```

### 2. Seed Data

The migration includes placeholder seed data for:
- United Manufacturing Hub (UMH) - Industrial IoT platform integration

Additional integrations can be added via the database as they become available.

### 3. Deploy Edge Function

Deploy the new API endpoint:

```bash
supabase functions deploy api-integrations
```

### 4. Install Dependencies

The marketplace requires `react-markdown` for rendering integration descriptions:

```bash
npm install react-markdown
```

This has been added to package.json automatically.

## Usage

### As an Admin User

1. Navigate to "App Store" in the sidebar
2. Browse available integrations
3. Use filters to find specific categories or search by name
4. Click on an integration to view details
5. Click "Install Integration" to add it to your tenant
6. View installed integrations in the "Installed" tab
7. Click on an installed integration to manage or uninstall

### As a Partner/Developer

#### Adding a New Integration

1. Insert a new row into the `integrations` table:
   ```sql
   INSERT INTO integrations (
     name, slug, description, category, status,
     provider_name, supported_systems, features,
     is_free, requires_api_key, version
   ) VALUES (
     'My Integration Name',
     'my-integration-slug',
     'Brief description here',
     'erp', -- or 'accounting', 'analytics', etc.
     'published',
     'Provider Name',
     '["System 1", "System 2"]'::jsonb,
     '["Feature 1", "Feature 2"]'::jsonb,
     true, -- is_free
     true, -- requires_api_key
     '1.0.0'
   );
   ```

2. Set `status = 'published'` to make it visible in the marketplace
3. Optionally add `documentation_url`, `github_repo_url`, `long_description` when available

#### Building a Custom Integration

Use the Eryxon Flow REST API and webhooks to build integrations:

1. Generate an API key in `/admin/config/api-keys`
2. Use the API documentation at `/api-docs` to understand available endpoints
3. Configure webhooks in `/admin/config/webhooks` for real-time events
4. Build your integration using any programming language with HTTP/REST support

## Categories

The following categories are supported:
- **erp**: ERP Systems (Manufacturing, Production)
- **accounting**: Accounting & Financial Software
- **crm**: Customer Relationship Management
- **inventory**: Inventory Management
- **shipping**: Shipping & Logistics
- **analytics**: Business Intelligence & Analytics
- **other**: Uncategorized / Custom

## Security & Permissions

- **Viewing**: All authenticated users can view the marketplace
- **Installing**: Only admins can install integrations
- **Uninstalling**: Only admins can uninstall integrations
- **Reviews**: Any authenticated user can submit one review per integration

## Integration with Existing Features

The marketplace integrates with existing features:

1. **API Keys** (`/admin/config/api-keys`)
   - Many integrations require API keys
   - Link API keys to installed integrations

2. **Webhooks** (`/admin/config/webhooks`)
   - Integrations may use webhooks for real-time sync
   - Link webhooks to installed integrations

3. **Subscription Plans** (`/my-plan`)
   - Integrations can specify minimum required plan tier
   - Enforce plan limits on integration usage

## Future Enhancements

Potential future improvements:
- OAuth-based installation flow for supported systems
- Automated webhook configuration during install
- Integration health monitoring and status indicators
- Usage analytics dashboard for integration activity
- In-app configuration wizards
- Marketplace moderation and approval workflows
- Integration testing and certification program
- Partner developer portal
- Revenue sharing for paid integrations

## File Structure

```
/home/user/eryxon-flow/
├── src/
│   ├── pages/
│   │   └── admin/
│   │       └── IntegrationsMarketplace.tsx    # Main marketplace page
│   ├── components/
│   │   └── admin/
│   │       └── IntegrationDetailModal.tsx     # Detail modal component
│   └── App.tsx                                # Route definition
├── supabase/
│   ├── functions/
│   │   └── api-integrations/
│   │       └── index.ts                       # Backend API endpoint
│   └── migrations/
│       └── 20251117210000_create_integrations_marketplace.sql
└── docs/
    └── INTEGRATIONS_MARKETPLACE.md            # This file
```

## Support

For questions or issues:
- Check the integration's documentation URL
- Contact the provider via their support email
- Review the GitHub starter kit examples
- Consult the main Eryxon Flow documentation

## License

This feature is part of Eryxon Flow MES and follows the same license terms.
