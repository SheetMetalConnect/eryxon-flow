import React, { useState } from 'react';
import {
  Box,
  Grid2,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
} from '@mui/material';
import Layout from '@/components/Layout';
import {
  DataTable,
  Column,
  TextInput,
  SelectInput,
  SwitchInput,
  CheckboxInput,
  RadioInput,
  AutocompleteInput,
  DateInput,
  ModalDialog,
  ConfirmDialog,
  FormDialog,
  StatusBadge,
  PriorityBadge,
  SeverityBadge,
  AddButton,
  EditButton,
  DeleteButton,
  SaveButton,
  CancelButton,
  RefreshButton,
  PrimaryButton,
  SecondaryButton,
  OutlinedButton,
  TextButton,
  EditIconButton,
  DeleteIconButton,
  PlayIconButton,
  PauseIconButton,
  StopIconButton,
  useToast,
} from '@/components/mui';

// Sample data for table
interface SampleRow {
  id: number;
  name: string;
  status: string;
  priority: string;
  date: string;
}

const sampleData: SampleRow[] = [
  { id: 1, name: 'Task Alpha', status: 'active', priority: 'high', date: '2025-01-15' },
  { id: 2, name: 'Task Beta', status: 'completed', priority: 'medium', date: '2025-01-14' },
  { id: 3, name: 'Task Gamma', status: 'pending', priority: 'low', date: '2025-01-13' },
  { id: 4, name: 'Task Delta', status: 'on-hold', priority: 'critical', date: '2025-01-12' },
  { id: 5, name: 'Task Epsilon', status: 'active', priority: 'high', date: '2025-01-11' },
];

export default function ComponentDemo() {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Form states
  const [textValue, setTextValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [switchValue, setSwitchValue] = useState(false);
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [radioValue, setRadioValue] = useState('option1');
  const [autocompleteValue, setAutocompleteValue] = useState(null);
  const [dateValue, setDateValue] = useState<Date | null>(null);

  // Table columns
  const columns: Column<SampleRow>[] = [
    { id: 'id', label: 'ID', minWidth: 70 },
    { id: 'name', label: 'Name', minWidth: 150 },
    {
      id: 'status',
      label: 'Status',
      minWidth: 120,
      format: (value) => <StatusBadge status={value as any} />,
    },
    {
      id: 'priority',
      label: 'Priority',
      minWidth: 120,
      format: (value) => <PriorityBadge priority={value as any} />,
    },
    { id: 'date', label: 'Date', minWidth: 100 },
  ];

  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  const radioOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  const autocompleteOptions = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'];

  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
          Material UI Component Library
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive showcase of all Material UI components with Sheet Metal Connect branding
        </Typography>
      </Box>

      <Grid2 container spacing={3}>
        {/* Buttons Section */}
        <Grid2 size={{ xs: 12 }}>
          <Card>
            <CardHeader title="Action Buttons" />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Primary Buttons
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <AddButton onClick={() => toast.showSuccess('Add clicked!')} />
                    <SaveButton onClick={() => toast.showInfo('Save clicked!')} />
                    <PrimaryButton onClick={() => toast.showInfo('Primary clicked!')}>
                      Primary
                    </PrimaryButton>
                    <PrimaryButton loading>Loading...</PrimaryButton>
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Secondary & Outlined Buttons
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <EditButton onClick={() => toast.showWarning('Edit clicked!')} />
                    <DeleteButton onClick={() => toast.showError('Delete clicked!')} />
                    <CancelButton />
                    <RefreshButton />
                    <SecondaryButton>Secondary</SecondaryButton>
                    <OutlinedButton>Outlined</OutlinedButton>
                    <TextButton>Text</TextButton>
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Icon Buttons
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <EditIconButton onClick={() => toast.showInfo('Edit icon clicked!')} />
                    <DeleteIconButton onClick={() => toast.showError('Delete icon clicked!')} />
                    <PlayIconButton onClick={() => toast.showSuccess('Play clicked!')} />
                    <PauseIconButton onClick={() => toast.showWarning('Pause clicked!')} />
                    <StopIconButton onClick={() => toast.showError('Stop clicked!')} />
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid2>

        {/* Status Badges Section */}
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="Status Badges" />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Status Types
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                    <StatusBadge status="success" />
                    <StatusBadge status="completed" />
                    <StatusBadge status="error" />
                    <StatusBadge status="warning" />
                    <StatusBadge status="info" />
                    <StatusBadge status="pending" />
                    <StatusBadge status="active" />
                    <StatusBadge status="on-hold" />
                    <StatusBadge status="cancelled" />
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Priority Badges
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                    <PriorityBadge priority="critical" />
                    <PriorityBadge priority="high" />
                    <PriorityBadge priority="medium" />
                    <PriorityBadge priority="low" />
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Severity Badges
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                    <SeverityBadge severity="critical" />
                    <SeverityBadge severity="high" />
                    <SeverityBadge severity="medium" />
                    <SeverityBadge severity="low" />
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid2>

        {/* Form Components Section */}
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="Form Components" />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                <TextInput
                  label="Text Input"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  helperText="Enter some text"
                />

                <SelectInput
                  label="Select Input"
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value as string)}
                  options={selectOptions}
                  helperText="Choose an option"
                />

                <SwitchInput
                  label="Switch Input"
                  checked={switchValue}
                  onChange={setSwitchValue}
                  helperText="Toggle this switch"
                />

                <CheckboxInput
                  label="Checkbox Input"
                  checked={checkboxValue}
                  onChange={setCheckboxValue}
                />

                <RadioInput
                  label="Radio Input"
                  value={radioValue}
                  onChange={setRadioValue}
                  options={radioOptions}
                />

                <AutocompleteInput
                  label="Autocomplete"
                  value={autocompleteValue}
                  onChange={setAutocompleteValue}
                  options={autocompleteOptions}
                />

                <DateInput
                  label="Date Picker"
                  value={dateValue}
                  onChange={setDateValue}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid2>

        {/* Dialog Section */}
        <Grid2 size={{ xs: 12 }}>
          <Card>
            <CardHeader title="Dialog Components" />
            <Divider />
            <CardContent>
              <Stack direction="row" spacing={2}>
                <OutlinedButton onClick={() => setModalOpen(true)}>
                  Open Modal Dialog
                </OutlinedButton>
                <OutlinedButton onClick={() => setConfirmOpen(true)}>
                  Open Confirm Dialog
                </OutlinedButton>
                <OutlinedButton onClick={() => setFormOpen(true)}>
                  Open Form Dialog
                </OutlinedButton>
              </Stack>
            </CardContent>
          </Card>
        </Grid2>

        {/* Data Table Section */}
        <Grid2 size={{ xs: 12 }}>
          <Card>
            <CardHeader title="Data Table with Sorting & Filtering" />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              <DataTable
                columns={columns}
                rows={sampleData}
                rowKey="id"
                onRowClick={(row) => toast.showInfo(`Clicked on ${row.name}`)}
                onEdit={(row) => toast.showWarning(`Edit ${row.name}`)}
                onDelete={(row) => toast.showError(`Delete ${row.name}`)}
                onView={(row) => toast.showInfo(`View ${row.name}`)}
                searchPlaceholder="Search tasks..."
              />
            </CardContent>
          </Card>
        </Grid2>

        {/* Typography Section */}
        <Grid2 size={{ xs: 12 }}>
          <Card>
            <CardHeader title="Typography System (Montserrat)" />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h1">Heading 1 - Montserrat 700</Typography>
                <Typography variant="h2">Heading 2 - Montserrat 700</Typography>
                <Typography variant="h3">Heading 3 - Montserrat 600</Typography>
                <Typography variant="h4">Heading 4 - Montserrat 600</Typography>
                <Typography variant="h5">Heading 5 - Montserrat 600</Typography>
                <Typography variant="h6">Heading 6 - Montserrat 600</Typography>
                <Typography variant="body1">
                  Body 1 - Montserrat 400: The quick brown fox jumps over the lazy dog
                </Typography>
                <Typography variant="body2">
                  Body 2 - Montserrat 400: The quick brown fox jumps over the lazy dog
                </Typography>
                <Typography variant="button">Button Text - Montserrat 500</Typography>
                <Typography variant="caption">Caption - Montserrat 400</Typography>
                <Typography variant="overline">Overline - Montserrat 500</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>

      {/* Modals */}
      <ModalDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Modal Dialog"
        actions={
          <>
            <CancelButton onClick={() => setModalOpen(false)} />
            <SaveButton onClick={() => setModalOpen(false)} />
          </>
        }
      >
        <Typography>
          This is a modal dialog with a custom title, content, and action buttons.
        </Typography>
      </ModalDialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          toast.showSuccess('Confirmed!');
          setConfirmOpen(false);
        }}
        title="Confirm Action"
        message="Are you sure you want to proceed with this action?"
        confirmColor="error"
      />

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={() => {
          toast.showSuccess('Form submitted!');
          setFormOpen(false);
        }}
        title="Form Dialog"
      >
        <Stack spacing={2}>
          <TextInput label="Name" />
          <TextInput label="Email" type="email" />
          <SelectInput label="Category" value="" onChange={() => {}} options={selectOptions} />
        </Stack>
      </FormDialog>
    </Layout>
  );
}
