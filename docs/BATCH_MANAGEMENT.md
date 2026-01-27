# Batch Management

Eryxon MES includes a comprehensive batch management system for grouping operations, handling nesting, and managing material requirements.

## Key Features

- **Batch Grouping**: Group multiple operations into a single batch for processing.
- **Nesting Support**: Create parent/child relationships between batches (e.g., a "Master Nest" containing multiple part batches).
- **Image Management**: Upload and view nesting layouts and shop-floor visual aids directly on the batch.
- **Material Requirements**: Track and manage material definitions for each batch.
- **Flexible Metadata**: Store arbitrary JSON metadata (e.g., cutting technologies, gas types) for integrations.

## Creating a Batch

1. Navigate to **Batches** > **Create Batch**.
2. Fill in the required details:
    - **Batch Number**: Unique identifier (auto-generated or manual).
    - **Type**: Select from Laser Nesting, Tube, Saw, Finishing, etc.
    - **Cell**: The manufacturing cell responsible for this batch.
3. **Optional Configuration**:
    - **Parent Batch**: Select a parent batch if this is a sub-batch (nesting).
    - **Images**: Upload "Nesting Image" (technical layout) and "Layout Image" (visual guide).
    - **Metadata**: specific JSON configuration for machine integration.
4. **Select Operations**: Choose from the list of available operations to include in this batch.

## Managing Batches

### Detail View
The Batch Detail page (`/admin/batches/:id`) provides a comprehensive view:
- **Status Workflow**: Track progress from Draft -> Ready -> In Progress -> Completed.
- **Sub-Batches**: View and navigate to nested batches.
- **Material Requirements**: Add and track material needs.
- **Images**: View uploaded nesting and layout images.

### Editing a Batch
Click the **Edit Batch** button on the detail page to modify:
- Batch Number, Type, Cell.
- Parent Batch relationship.
- Images and Metadata.
*Note: Modifying the list of operations in a batch is currently done by deleting and recreating the batch or managing operations individually.*

## Technical Details

### Database Schema
- **`operation_batches`**: Stores batch header info.
    - `parent_batch_id`: References parent batch for nesting.
    - `nesting_metadata`: JSONB column for arbitrary data.
    - `nesting_image_url` / `layout_image_url`: Links to storage.
- **`batch_operations`**: Junction table linking operations to batches.
- **`batch_requirements`**: Stores material requirements.

### Storage
Images are stored in the `batch-images` Supabase Storage bucket. RLS policies ensure secure access.
