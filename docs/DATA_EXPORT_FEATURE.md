# Data Export / Offboarding Feature

This document describes the Data Export feature that allows tenants to download all their data when offboarding or for backup purposes.

## Overview

The Data Export feature provides a complete data takeout solution for tenants who want to:
- **Offboard** from the platform (take their data with them)
- **Backup** their data regularly
- **Migrate** data to another system
- **Comply** with data portability regulations (GDPR, etc.)

## Architecture

### Frontend
- **Location:** `/src/pages/admin/DataExport.tsx`
- **Route:** `/admin/data-export`
- **Access:** Admin users only
- **Navigation:** Admin sidebar → Configuration → Data Export

### Backend
- **Location:** `/supabase/functions/api-export/index.ts`
- **Endpoint:** `GET /functions/v1/api-export`
- **Authentication:** Requires authenticated admin user
- **Security:** Row-Level Security (RLS) automatically filters by tenant_id

## Features

### 1. Multiple Export Formats

#### CSV Export (ZIP Bundle)
- Each entity exported as a separate CSV file
- All CSVs bundled into a single ZIP archive
- Includes metadata as JSON files
- Best for: Excel, Google Sheets, database imports

#### JSON Export
- Single JSON file with all data
- Nested structure preserves relationships
- Includes metadata and tenant info
- Best for: Developer use, API integrations, archives

### 2. Granular Entity Selection

Users can select which entities to export:

| Entity | Description |
|--------|-------------|
| Jobs | All manufacturing jobs |
| Parts | All parts across jobs |
| Operations | All operations/tasks |
| Cells | Production workflow stages |
| Time Entries | Time tracking records |
| Time Entry Pauses | Pause records during time tracking |
| Assignments | Work assignments to operators |
| Issues | Production issues and defects |
| Substeps | Operation substeps |
| Resources | Tools, fixtures, molds |
| Operation Resources | Resource assignments to operations |
| Materials | Material catalog |
| User Profiles | User profiles within tenant |
| API Keys | API key configurations (hashed, no secrets) |
| Webhooks | Webhook configurations |
| Webhook Logs | Webhook delivery logs |

### 3. Security & Privacy

✅ **Tenant Isolation**
- RLS policies ensure users only export their own tenant's data
- No cross-tenant data leakage possible

✅ **Role-Based Access**
- Only admin users can export data
- Operators cannot access this feature

✅ **Data Sanitization**
- API keys exported without the secret hash
- Sensitive fields are handled appropriately

✅ **No Audit Trail**
- Exports are not logged (to respect privacy)
- No impact on tenant usage metrics

### 4. What's Included

✅ **Included in Export:**
- All database records for selected entities
- Export metadata (timestamp, record counts)
- Tenant information (name, plan, created date)

❌ **Not Included:**
- File attachments (PDFs, CAD files, images)
  - Only file paths/references are included
  - Files must be downloaded separately via Storage API
- System-internal fields (created_at, updated_at may be included)

## Usage Guide

### For End Users

1. **Navigate to Data Export**
   - Log in as an admin user
   - Go to sidebar → Configuration → Data Export

2. **Choose Export Format**
   - CSV Files (ZIP) - for spreadsheets
   - JSON File - for developers

3. **Select Data**
   - Click "Select All" for complete export
   - Or manually select specific entities

4. **Export**
   - Click "Export Data" button
   - Wait for processing (may take a few seconds for large datasets)
   - Download will start automatically

5. **Access Your Data**
   - CSV: Unzip and open files in Excel/Google Sheets
   - JSON: Use with your preferred tools or import to another system

### For Developers

#### API Endpoint

```
GET /functions/v1/api-export
```

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `entities` | string | Comma-separated entity names or "all" | `all` |
| `format` | string | Export format: "json" or "csv" | `json` |

#### Request Headers

```
Authorization: Bearer <user-access-token>
```

#### Example Request (cURL)

```bash
# Export all data as JSON
curl -X GET \
  "https://your-project.supabase.co/functions/v1/api-export?entities=all&format=json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -o export.json

# Export specific entities
curl -X GET \
  "https://your-project.supabase.co/functions/v1/api-export?entities=jobs,parts,operations" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -o export.json
```

#### Example Request (JavaScript)

```javascript
// Using fetch
const exportData = async () => {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${supabaseUrl}/functions/v1/api-export?entities=all&format=json`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  );

  const data = await response.json();

  // Download as file
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `export-${Date.now()}.json`;
  a.click();
};
```

#### Response Format (JSON)

```json
{
  "_metadata": {
    "exported_at": "2025-11-17T10:30:00.000Z",
    "tenant_id": "uuid-here",
    "format": "json",
    "tables": [
      { "name": "jobs", "count": 150 },
      { "name": "parts", "count": 450 },
      { "name": "operations", "count": 1200 }
    ]
  },
  "_tenant_info": {
    "name": "Acme Manufacturing",
    "plan": "pro",
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  "jobs": [
    {
      "id": "uuid",
      "job_number": "JOB-001",
      "customer": "Customer Name",
      "due_date": "2025-12-31",
      "status": "in_progress",
      "tenant_id": "uuid"
    }
  ],
  "parts": [...],
  "operations": [...]
}
```

## Testing

### Local Development

1. **Start Supabase:**
   ```bash
   supabase start
   ```

2. **Serve the function:**
   ```bash
   supabase functions serve api-export
   ```

3. **Start the frontend:**
   ```bash
   npm run dev
   # or
   bun dev
   ```

4. **Access the UI:**
   - Navigate to: `http://localhost:5173/admin/data-export`
   - Log in with an admin account
   - Test the export functionality

### Test Scenarios

✅ **Happy Path:**
1. Select all entities
2. Choose CSV format
3. Export successfully
4. Verify ZIP contains all CSV files

✅ **Partial Export:**
1. Select only 2-3 entities
2. Export as JSON
3. Verify only selected entities are in the export

✅ **Security:**
1. Try accessing as operator user (should be blocked)
2. Verify RLS filters data correctly
3. Confirm API keys don't include secrets

✅ **Edge Cases:**
1. Export with no data (empty tenant)
2. Export very large dataset
3. Cancel during export

## Deployment

### Deploy Backend Function

```bash
# Deploy the api-export function
supabase functions deploy api-export
```

### Deploy Frontend

The frontend is automatically deployed with your React app. No special steps needed.

### Verify Deployment

1. Test the endpoint in production:
   ```bash
   curl -X GET \
     "https://your-project.supabase.co/functions/v1/api-export?entities=jobs" \
     -H "Authorization: Bearer $PROD_TOKEN"
   ```

2. Test the UI:
   - Log in to production as admin
   - Navigate to Data Export page
   - Perform a test export

## Maintenance

### Adding New Entities

When you add a new table to the database and want it included in exports:

1. **Update the backend function** (`/supabase/functions/api-export/index.ts`):
   ```typescript
   const allTables = [
     // ... existing tables
     'new_table_name',  // Add here
   ];
   ```

2. **Update the frontend** (`/src/pages/admin/DataExport.tsx`):
   ```typescript
   const EXPORTABLE_ENTITIES = [
     // ... existing entities
     {
       id: 'new_table_name',
       label: 'New Entity',
       description: 'Description of new entity'
     },
   ];
   ```

3. **Test and deploy:**
   ```bash
   supabase functions deploy api-export
   ```

### Performance Considerations

✅ **Automatic Pagination Implemented**

The export function automatically handles large datasets by paginating through results:

- **Batch Size:** 1,000 rows per fetch
- **Automatic Iteration:** Continues fetching until all rows are retrieved
- **No Row Limit:** Exports complete dataset regardless of size
- **Progress Logging:** Logs progress for each table in function logs

**Implementation Details:**
```typescript
// The function uses .range() to paginate through all records
const BATCH_SIZE = 1000;
let offset = 0;
let allData: any[] = [];

while (hasMore) {
  const { data } = await supabaseClient
    .from(table)
    .select(selectFields, { count: 'exact' })
    .range(offset, offset + BATCH_SIZE - 1);

  allData = allData.concat(data || []);
  hasMore = (data?.length === BATCH_SIZE);
  offset += BATCH_SIZE;
}
```

**Additional Optimizations for Very Large Datasets (>1M records):**

1. **Streaming** - Stream data instead of loading all at once
2. **Background jobs** - Use a job queue for very large exports
3. **Compressed archives** - Use gzip compression for download
4. **Partial exports** - Allow date-range filtering to export subsets

## Support & Troubleshooting

### Common Issues

**Issue:** Export button doesn't respond
- **Solution:** Check browser console for errors, ensure admin role

**Issue:** Download doesn't start
- **Solution:** Check popup blocker, try different browser

**Issue:** ZIP file is corrupted
- **Solution:** Ensure JSZip library is properly installed

**Issue:** Missing data in export
- **Solution:** Verify RLS policies, check entity selection

**Issue:** Export takes too long
- **Solution:** Select fewer entities, check database performance

### Support Contacts

For issues or questions:
1. Check this documentation
2. Review `EDGE_FUNCTIONS_SETUP.md` for Edge Function help
3. Contact your development team
4. File an issue in the project repository

## Compliance Notes

This feature helps with:
- **GDPR Article 20** - Right to data portability
- **CCPA** - Consumer data access rights
- **Data retention** policies
- **Audit requirements**

When a tenant offboards:
1. They can export all their data
2. Consider retention policies for deleting tenant data
3. Keep audit logs as required by your policies

## Future Enhancements

Potential improvements for v2:
- [ ] Scheduled automatic exports
- [ ] Email export link instead of direct download
- [ ] Include file attachments in export
- [ ] Custom field selection (not just entire entities)
- [ ] Export filtering by date range
- [ ] Encrypted exports with password
- [ ] Export to cloud storage (S3, Google Drive, etc.)
- [ ] Differential exports (only changed data)
- [ ] Import functionality (data restore)

## Summary

The Data Export feature provides:
✅ Complete data portability for tenants
✅ Multiple export formats (CSV, JSON)
✅ Granular entity selection
✅ Security and tenant isolation
✅ Simple UI for end users
✅ API for programmatic access

This helps ensure compliance, enables migrations, and provides peace of mind to your customers that their data is always accessible.
