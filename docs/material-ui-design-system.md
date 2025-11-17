# Material UI Design System - Sheet Metal Connect

## Overview

This document describes the comprehensive Material UI design system implementation for the Sheet Metal Connect application. The design system provides a modern, cohesive, and professional UI using Material UI v6 with custom branding.

## Brand Colors

The application uses the following brand colors:

- **Primary Blue**: `#47B5E2` - Used for primary actions and interactive elements
- **Primary Purple**: `#6658A3` - Used for secondary actions and accents
- **Dark**: `#231F20` - Used for text and dark backgrounds
- **Success**: `#4CAF50` - Standard Material UI success color
- **Warning**: `#FF9800` - Standard Material UI warning color
- **Error**: `#F44336` - Standard Material UI error color

## Typography System

All typography uses the **Montserrat** font family with the following hierarchy:

- **H1-H2**: Montserrat 700 (Bold) - Major headings
- **H3-H6**: Montserrat 600 (Semi-Bold) - Section headings
- **Body**: Montserrat 400 (Regular) - Body text
- **Button**: Montserrat 500 (Medium) - Button labels
- **Caption**: Montserrat 400 (Regular) - Small text
- **Overline**: Montserrat 500 (Medium) - Labels

## Theme Configuration

The theme is configured in `/src/theme/theme.ts` with the following features:

### Light Theme
- Background: `#F5F7FA` (Light gray)
- Paper: `#FFFFFF` (White)
- Text Primary: `#231F20` (Dark)
- Primary Color: `#47B5E2` (Blue)
- Secondary Color: `#6658A3` (Purple)

### Dark Theme
- Background: `#231F20` (Dark)
- Paper: `#2C2829` (Slightly lighter dark)
- Text Primary: `#FFFFFF` (White)
- Primary Color: `#47B5E2` (Blue)
- Secondary Color: `#6658A3` (Purple)

### Design Tokens

- **Border Radius**: 8px (standard), 12px (cards)
- **Spacing**: 8px base unit
- **Shadows**: Custom shadows using brand dark color with varying opacity

## Component Library

All custom Material UI components are located in `/src/components/mui/` and can be imported from `/src/components/mui/index.ts`.

### Layout Components

#### AppHeader
Location: `/src/components/mui/AppHeader.tsx`

The header bar features:
- **Gradient Background**: Linear gradient from purple (`#6658A3`) to blue (`#47B5E2`)
- **Sticky Positioning**: Stays at top with shadow on scroll
- **Navigation**: Role-based navigation links
- **User Profile**: Avatar, name, role badge, and menu
- **Theme Toggle**: Dark/light mode switcher

Usage:
```tsx
import { AppHeader } from '@/components/mui';

<AppHeader />
```

#### MuiLayout
Location: `/src/components/mui/MuiLayout.tsx`

Main layout wrapper with header and content area.

Usage:
```tsx
import { MuiLayout } from '@/components/mui';

<MuiLayout>
  {/* Your page content */}
</MuiLayout>
```

### Data Display

#### DataTable
Location: `/src/components/mui/DataTable.tsx`

Advanced data table with:
- Sorting (click column headers)
- Filtering (search bar)
- Pagination
- Row actions (view, edit, delete)
- Custom cell formatting
- Loading state
- Empty state

Usage:
```tsx
import { DataTable, Column } from '@/components/mui';

const columns: Column[] = [
  { id: 'name', label: 'Name', sortable: true },
  { id: 'status', label: 'Status', format: (value) => <StatusBadge status={value} /> },
];

<DataTable
  columns={columns}
  rows={data}
  rowKey="id"
  onRowClick={handleRowClick}
  onEdit={handleEdit}
  onDelete={handleDelete}
  searchable
/>
```

### Form Components

Location: `/src/components/mui/FormComponents.tsx`

All form components support validation states and helper text:

- **TextInput**: Standard text input field
- **SelectInput**: Dropdown select with options
- **SwitchInput**: Toggle switch
- **CheckboxInput**: Single checkbox
- **RadioInput**: Radio button group
- **AutocompleteInput**: Searchable select with autocomplete
- **DateInput**: Date picker
- **TimeInput**: Time picker
- **DateTimeInput**: Combined date and time picker

Usage:
```tsx
import { TextInput, SelectInput, DateInput } from '@/components/mui';

<TextInput
  label="Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={errors.name}
  helperText="Enter your full name"
/>

<SelectInput
  label="Category"
  value={category}
  onChange={(e) => setCategory(e.target.value)}
  options={[
    { value: 'cat1', label: 'Category 1' },
    { value: 'cat2', label: 'Category 2' },
  ]}
/>

<DateInput
  label="Due Date"
  value={dueDate}
  onChange={setDueDate}
/>
```

### Dialog Components

Location: `/src/components/mui/ModalDialog.tsx`

Three types of dialogs:

#### ModalDialog
General purpose modal with custom content and actions.

```tsx
import { ModalDialog } from '@/components/mui';

<ModalDialog
  open={open}
  onClose={handleClose}
  title="Modal Title"
  actions={
    <>
      <CancelButton onClick={handleClose} />
      <SaveButton onClick={handleSave} />
    </>
  }
>
  {/* Modal content */}
</ModalDialog>
```

#### ConfirmDialog
Confirmation dialog for destructive actions.

```tsx
import { ConfirmDialog } from '@/components/mui';

<ConfirmDialog
  open={open}
  onClose={handleClose}
  onConfirm={handleConfirm}
  title="Confirm Delete"
  message="Are you sure you want to delete this item?"
  confirmColor="error"
/>
```

#### FormDialog
Dialog with form submission handling.

```tsx
import { FormDialog } from '@/components/mui';

<FormDialog
  open={open}
  onClose={handleClose}
  onSubmit={handleSubmit}
  title="Create Item"
>
  {/* Form fields */}
</FormDialog>
```

### Status & Badges

Location: `/src/components/mui/StatusBadge.tsx`

#### StatusBadge
Displays status with color coding and optional icon.

Supported statuses:
- `success`, `completed` - Green
- `error`, `critical` - Red
- `warning`, `high` - Orange
- `info`, `medium` - Blue
- `pending`, `low` - Gray
- `active` - Amber
- `on-hold` - Orange-red
- `cancelled` - Gray

```tsx
import { StatusBadge, PriorityBadge, SeverityBadge } from '@/components/mui';

<StatusBadge status="active" />
<PriorityBadge priority="high" />
<SeverityBadge severity="critical" />
```

### Action Buttons

Location: `/src/components/mui/ActionButtons.tsx`

Comprehensive set of pre-configured buttons:

#### Primary Buttons
- `PrimaryButton` - Blue background
- `SecondaryButton` - Purple background
- `OutlinedButton` - Outlined style
- `TextButton` - Text only

#### Named Action Buttons
- `AddButton` - Add icon + primary style
- `SaveButton` - Save icon + primary style
- `EditButton` - Edit icon + outlined
- `DeleteButton` - Delete icon + outlined red
- `CancelButton` - Close icon + outlined
- `ConfirmButton` - Check icon + primary
- `RefreshButton` - Refresh icon + outlined
- `DownloadButton`, `UploadButton`, `SearchButton`, `FilterButton`

#### Icon Buttons
- `EditIconButton`, `DeleteIconButton`
- `PlayIconButton`, `PauseIconButton`, `StopIconButton`

All buttons support loading state:

```tsx
import { AddButton, SaveButton, EditIconButton } from '@/components/mui';

<AddButton onClick={handleAdd} loading={isLoading} />
<SaveButton onClick={handleSave} />
<EditIconButton onClick={handleEdit} />
```

### Toast Notifications

Location: `/src/components/mui/ToastNotification.tsx`

Toast notification system with multiple severity levels.

Setup in App.tsx:
```tsx
import { ToastProvider } from '@/components/mui';

<ToastProvider>
  {/* Your app */}
</ToastProvider>
```

Usage in components:
```tsx
import { useToast } from '@/components/mui';

const MyComponent = () => {
  const toast = useToast();

  const handleAction = () => {
    toast.showSuccess('Action completed successfully!');
    toast.showError('An error occurred');
    toast.showWarning('Warning message');
    toast.showInfo('Information message');

    // Custom toast
    toast.showToast('Custom message', 'success', 5000);
  };
};
```

## Theme Provider

Location: `/src/theme/ThemeProvider.tsx`

Wrap your app with ThemeProvider to enable theming:

```tsx
import { ThemeProvider, useThemeMode } from '@/theme/ThemeProvider';

// In App.tsx
<ThemeProvider>
  {/* Your app */}
</ThemeProvider>

// In any component
const MyComponent = () => {
  const { mode, toggleTheme } = useThemeMode();

  return (
    <button onClick={toggleTheme}>
      Current mode: {mode}
    </button>
  );
};
```

The theme preference is automatically saved to localStorage.

## Responsive Design

All components are responsive with breakpoints:
- **xs**: 0px+ (mobile)
- **sm**: 600px+ (tablet)
- **md**: 900px+ (desktop)
- **lg**: 1200px+ (large desktop)
- **xl**: 1536px+ (extra large)

Use Material UI's responsive utilities:

```tsx
<Box sx={{
  display: { xs: 'block', md: 'flex' },
  padding: { xs: 2, md: 4 }
}}>
  {/* Content */}
</Box>
```

## Migration Guide

### Replacing Old Components

Old shadcn/ui components can be replaced with Material UI components:

| Old Component | New Component |
|--------------|---------------|
| `<Button>` | `<PrimaryButton>` or `<OutlinedButton>` |
| `<Card>` | `<Card>` from `@mui/material` |
| `<Input>` | `<TextInput>` |
| `<Select>` | `<SelectInput>` |
| `<Dialog>` | `<ModalDialog>` or `<FormDialog>` |
| `<Badge>` | `<StatusBadge>` |
| `<Table>` | `<DataTable>` |

### Example Migration

Before:
```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

<Button onClick={handleClick}>Save</Button>
<Input value={value} onChange={handleChange} />
```

After:
```tsx
import { SaveButton, TextInput } from '@/components/mui';

<SaveButton onClick={handleClick} />
<TextInput value={value} onChange={(e) => handleChange(e.target.value)} />
```

## Component Demo

A comprehensive component demo is available at `/src/pages/ComponentDemo.tsx` showcasing all components with examples.

To view the demo, add the route to your router:

```tsx
<Route path="/component-demo" element={<ComponentDemo />} />
```

## Best Practices

1. **Use Design Tokens**: Always use theme values instead of hardcoded colors/spacing
2. **Consistent Spacing**: Use `sx={{ p: 2, m: 3 }}` with theme spacing units
3. **Color Palette**: Use `primary.main`, `secondary.main`, etc. from theme
4. **Typography**: Use Material UI typography variants for consistent text styling
5. **Responsive First**: Design for mobile first, then add larger breakpoints
6. **Accessibility**: All components include proper ARIA labels and keyboard navigation

## Dark Mode Support

Dark mode is fully supported and can be toggled:
- Via the theme toggle button in the header
- Programmatically using `useThemeMode()` hook
- Automatically saved to localStorage

All colors automatically adjust based on theme mode.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Performance

- Components use React.memo where appropriate
- Large tables support pagination to limit DOM nodes
- Theme switching is instant with no flash
- Fonts are loaded asynchronously

---

For questions or issues with the design system, please refer to the component source code or create an issue in the repository.
