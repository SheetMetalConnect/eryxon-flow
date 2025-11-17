import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Button,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayArrowIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Timer as TimerIcon,
  BugReport as BugReportIcon,
  Description as DocsIcon,
  VideoLibrary as VideoIcon,
  Email as EmailIcon,
  CheckCircle as CheckIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  Build as BuildIcon,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`help-tabpanel-${index}`}
      aria-labelledby={`help-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Help() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Help & Documentation
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Everything you need to know about Eryxon Flow
        </Typography>
      </Box>

      {/* Quick Links */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardActionArea href="/api-docs">
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <CodeIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  API Docs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Complete API reference
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardActionArea href="/pricing">
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <StorageIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Plans & Pricing
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View subscription plans
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardActionArea
              onClick={() =>
                window.open(
                  'https://github.com/SheetMetalConnect/eryxon-flow',
                  '_blank'
                )
              }
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <DocsIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Documentation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Full technical docs
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardActionArea
              onClick={() =>
                window.open('mailto:support@eryxonflow.com', '_blank')
              }
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <EmailIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Contact Support
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Get help from our team
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper elevation={1}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<PlayArrowIcon />} label="Getting Started" iconPosition="start" />
          <Tab icon={<PersonIcon />} label="For Operators" iconPosition="start" />
          <Tab icon={<AdminIcon />} label="For Admins" iconPosition="start" />
          <Tab icon={<BugReportIcon />} label="FAQ & Troubleshooting" iconPosition="start" />
        </Tabs>

        {/* Getting Started Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: 3 }}>
            <Typography variant="h5" gutterBottom fontWeight="600">
              Welcome to Eryxon Flow!
            </Typography>
            <Typography paragraph color="text.secondary">
              Eryxon Flow is a manufacturing execution system designed for sheet metal
              fabrication. Here's how to get started:
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Quick Tip: Your role determines what you can access
              </Typography>
              <Typography variant="body2">
                <strong>Operators</strong> focus on executing work, while{' '}
                <strong>Admins</strong> manage jobs, configure settings, and oversee
                production.
              </Typography>
            </Alert>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              How Eryxon Flow Works
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="1. Jobs are created by admins"
                  secondary="Each job represents a customer order or manufacturing project"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="2. Jobs contain Parts"
                  secondary="Parts can be standalone components or assemblies made of multiple parts"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="3. Parts have Operations"
                  secondary="Operations are specific tasks (cutting, bending, welding, etc.) performed on parts"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="4. Operators execute operations"
                  secondary="Track time, report issues, and mark work complete from the Work Queue"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="5. Real-time tracking"
                  secondary="Admins see live updates of production progress on the dashboard"
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Key Features
            </Typography>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom fontWeight="600">
                      <TimerIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Time Tracking
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Track actual time vs. estimated time for accurate costing and
                      scheduling. Pause and resume as needed.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom fontWeight="600">
                      <BugReportIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Issue Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Report production issues with photos. Admins review and resolve
                      issues in real-time.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom fontWeight="600">
                      <BuildIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      3D CAD Viewer
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      View STEP files directly in the browser with interactive 3D
                      controls, wireframe mode, and exploded views.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom fontWeight="600">
                      <CodeIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      API Integration
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Connect with ERP, accounting, and other systems via RESTful API
                      with webhooks for real-time events.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* For Operators Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 3 }}>
            <Typography variant="h5" gutterBottom fontWeight="600">
              Operator Guide
            </Typography>
            <Typography paragraph color="text.secondary">
              As an operator, you'll spend most of your time in the Work Queue executing
              operations assigned to you.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Daily Workflow
            </Typography>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="600">1. View Your Work Queue</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  After logging in, you'll see your <strong>Work Queue</strong> with all
                  operations assigned to you.
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Filter by status, material, or cell"
                      secondary="Use the filter buttons at the top to narrow down your list"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Search by part or job number"
                      secondary="Use Cmd+K (Mac) or Ctrl+K (Windows) for quick search"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Sort by priority or due date"
                      secondary="Click column headers to sort the list"
                    />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="600">2. Start an Operation</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>Click on an operation card to open details:</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Review operation details"
                      secondary="Check part number, material, and any special notes"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="View CAD files (if available)"
                      secondary="Click 'View 3D' to see STEP files in the 3D viewer"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Click 'Start Timing'"
                      secondary="This begins tracking your time and marks the operation as in-progress"
                    />
                  </ListItem>
                </List>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  You can only time one operation at a time. Starting a new operation will
                  stop timing on the previous one.
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="600">3. During Work</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>While working on an operation:</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="The timer runs automatically"
                      secondary="You'll see elapsed time in the Currently Timing widget at the top"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Pause if needed"
                      secondary="Taking a break? Click 'Pause' - pause time won't count toward the operation"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Report issues"
                      secondary="If you encounter problems, click 'Report Issue' and select severity"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Add photos to issues"
                      secondary="Use your device camera to document problems"
                    />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="600">4. Complete the Operation</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>When you're done:</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Click 'Stop Timing'"
                      secondary="This records your actual time and stops the timer"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Mark as complete"
                      secondary="Click 'Complete Operation' to move it to finished status"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Move to next operation"
                      secondary="Return to Work Queue and select the next operation"
                    />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="600">5. Review Your Activity</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  Click <strong>My Activity</strong> in the bottom navigation to see:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Your completed work for the last 7 days" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Time spent on each operation" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Total hours worked" />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Tips for Operators
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Always start timing before you begin work - accurate time tracking helps with scheduling" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Pause the timer during breaks or interruptions - only work time should be tracked" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Report issues immediately when they occur - don't wait until the end of the day" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Take photos of issues - visual documentation helps admins resolve problems faster" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Mark operations complete as soon as you finish - keeps the queue current" />
                </ListItem>
              </List>
            </Paper>
          </Box>
        </TabPanel>

        {/* For Admins Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ px: 3 }}>
            <Typography variant="h5" gutterBottom fontWeight="600">
              Admin Guide
            </Typography>
            <Typography paragraph color="text.secondary">
              As an admin, you have full access to manage jobs, configure the system, and
              oversee production.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Key Admin Tasks
            </Typography>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="600">Creating Jobs</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  Navigate to <strong>Jobs → Create New Job</strong>
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  Step 1: Job Details
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Job Number"
                      secondary="Unique identifier (e.g., JOB-001, PO-12345)"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Customer Name" secondary="Who is this for?" />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Due Date"
                      secondary="When does the customer need it?"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Notes (optional)"
                      secondary="Special instructions, rush order, etc."
                    />
                  </ListItem>
                </List>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Step 2: Add Parts
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Part Number"
                      secondary="Unique within this job (e.g., PART-001)"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Material"
                      secondary="Select from your materials catalog"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Quantity"
                      secondary="How many of this part to make"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Parent Part (for assemblies)"
                      secondary="If this is a component of an assembly, select the parent"
                    />
                  </ListItem>
                </List>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Step 3: Add Operations to Each Part
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Operation Name"
                      secondary="E.g., Laser Cut, Bend 90°, Weld Corner"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Cell/Stage"
                      secondary="Which workflow stage? (Cutting, Bending, etc.)"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Estimated Time"
                      secondary="How long should this take? (minutes)"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Sequence"
                      secondary="What order should operations be done in?"
                    />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="600">Assigning Work</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  Go to <strong>Assignments</strong> page:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Select a part from the dropdown"
                      secondary="Choose from available parts in active jobs"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Select an operator"
                      secondary="Assign to the person who will do the work"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Click Assign"
                      secondary="Operator will now see this part's operations in their Work Queue"
                    />
                  </ListItem>
                </List>
                <Alert severity="info" sx={{ mt: 2 }}>
                  You can assign the same part to multiple operators for collaborative work.
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="600">Managing Issues</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  When operators report issues, they appear in <strong>Issues</strong> page:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Review issue details"
                      secondary="Read description, view photos, check severity"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Approve if valid"
                      secondary="Confirms it's a real issue that needs fixing"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Reject if not valid"
                      secondary="Use this if the issue was reported in error"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Close when resolved"
                      secondary="Mark as closed once the problem is fixed"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Add resolution notes"
                      secondary="Document how the issue was resolved"
                    />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="600">Configuring the System</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" gutterBottom>
                  Settings Menu (click Settings in sidebar)
                </Typography>

                <Typography variant="body2" fontWeight="600" sx={{ mt: 2 }}>
                  Stages/Cells
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Define your workflow stages (Cutting, Bending, Welding, etc.). Assign
                  colors for visual identification.
                </Typography>

                <Typography variant="body2" fontWeight="600">
                  Materials
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Create a catalog of materials you work with (Steel 1018, Aluminum 6061,
                  etc.)
                </Typography>

                <Typography variant="body2" fontWeight="600">
                  Resources
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Track tools, fixtures, molds, and equipment used in operations
                </Typography>

                <Typography variant="body2" fontWeight="600">
                  Users
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Create operator and admin accounts. Set roles and permissions.
                </Typography>

                <Typography variant="body2" fontWeight="600">
                  API Keys
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Generate keys for external system integrations (ERP, accounting software)
                </Typography>

                <Typography variant="body2" fontWeight="600">
                  Webhooks
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Configure real-time notifications to external systems when events occur
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="600">Exporting Data</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  Navigate to <strong>Data Export</strong> page:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Select which data to export"
                      secondary="Choose specific entities or 'Select All' for complete backup"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Choose format"
                      secondary="JSON for developers, CSV for Excel/spreadsheets"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Click Export"
                      secondary="Download starts automatically. CSV format comes as a ZIP archive."
                    />
                  </ListItem>
                </List>
                <Alert severity="info" sx={{ mt: 2 }}>
                  Exports include all your data but exclude uploaded files. File paths are
                  included so you can download files separately from storage.
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Best Practices for Admins
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Set up your workflow cells first - this makes job creation much easier" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Create a materials catalog before adding jobs - saves time later" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Review the dashboard daily - catch issues early and see what needs attention" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Respond to issues quickly - operators are waiting for your approval/guidance" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Use due date overrides when customer dates change - keeps planning accurate" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Export data regularly for backups - monthly exports are recommended" />
                </ListItem>
              </List>
            </Paper>
          </Box>
        </TabPanel>

        {/* FAQ & Troubleshooting Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ px: 3 }}>
            <Typography variant="h5" gutterBottom fontWeight="600">
              Frequently Asked Questions
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              General Questions
            </Typography>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>What's the difference between Jobs, Parts, and Operations?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  <strong>Job:</strong> A customer order or manufacturing project (e.g.,
                  "Bracket Assembly for Customer ABC")
                </Typography>
                <Typography paragraph>
                  <strong>Part:</strong> An individual component within a job (e.g., "Left
                  Bracket Plate"). Parts can be assemblies (containing other parts) or
                  standalone components.
                </Typography>
                <Typography paragraph>
                  <strong>Operation:</strong> A specific task performed on a part (e.g.,
                  "Laser Cut", "Bend 90°", "Weld Corner"). Operations are what operators
                  actually do.
                </Typography>
                <Typography paragraph>
                  <strong>Hierarchy:</strong> Job → Parts → Operations
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Can I time multiple operations at once?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  No, you can only time one operation at a time per operator. If you start
                  timing a new operation, any previously active timer will automatically
                  stop. This ensures accurate time tracking and prevents overlapping time
                  entries.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>What happens to pause time?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  When you pause a timer, the pause duration is tracked separately. When you
                  stop timing, the system calculates:
                </Typography>
                <Typography
                  component="pre"
                  sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}
                >
                  Total Time = Stop Time - Start Time{'\n'}
                  Pause Time = Sum of all pauses{'\n'}
                  Effective Time = Total Time - Pause Time
                </Typography>
                <Typography paragraph sx={{ mt: 2 }}>
                  Only the Effective Time counts toward the operation's actual time. This
                  ensures accurate costing and scheduling.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>How do assemblies work?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  Assemblies are parts that contain other parts. For example:
                </Typography>
                <Typography
                  component="pre"
                  sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}
                >
                  Bracket Assembly (parent){'\n'}
                  ├── Left Plate (child){'\n'}
                  ├── Right Plate (child){'\n'}
                  └── Mounting Bracket (child)
                </Typography>
                <Typography paragraph sx={{ mt: 2 }}>
                  Each part (parent and children) can have its own operations. The assembly
                  hierarchy just shows how parts relate to each other.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Troubleshooting
            </Typography>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>I don't see any operations in my Work Queue</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  <strong>Check 1:</strong> Make sure work has been assigned to you. Ask
                  your admin to assign parts to your account.
                </Typography>
                <Typography paragraph>
                  <strong>Check 2:</strong> Check your filters. Clear all filters to see if
                  operations appear.
                </Typography>
                <Typography paragraph>
                  <strong>Check 3:</strong> You might have already completed all your
                  assigned work. Check "My Activity" to see recent completions.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Timer doesn't start when I click "Start Timing"</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  <strong>Cause:</strong> You likely have another operation already timing.
                </Typography>
                <Typography paragraph>
                  <strong>Solution:</strong> Check the "Currently Timing" widget at the top.
                  Stop that timer first, then start the new operation.
                </Typography>
                <Typography paragraph>
                  <strong>Note:</strong> The system only allows one active timer per
                  operator to prevent confusion and ensure accurate time tracking.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>3D CAD viewer won't load my STEP file</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  <strong>Check 1:</strong> Is the file a valid STEP format (.step or .stp)?
                </Typography>
                <Typography paragraph>
                  <strong>Check 2:</strong> File size - Maximum is 50MB. Large assemblies
                  may need to be split.
                </Typography>
                <Typography paragraph>
                  <strong>Check 3:</strong> Try re-exporting from your CAD software with
                  standard STEP settings.
                </Typography>
                <Typography paragraph>
                  <strong>Check 4:</strong> Click "Fit View" if the model loaded but appears
                  off-screen.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Can't create a new job (Admin)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  <strong>Check plan limits:</strong> Go to "My Plan" page and check if
                  you've reached your maximum job count for your subscription plan.
                </Typography>
                <Typography paragraph>
                  <strong>Free plan:</strong> 10 jobs max
                  <br />
                  <strong>Pro plan:</strong> 100 jobs max
                  <br />
                  <strong>Premium plan:</strong> Unlimited
                </Typography>
                <Typography paragraph>
                  <strong>Solution:</strong> Complete or delete old jobs, or upgrade your
                  plan.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Data export is taking a long time</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  Large datasets can take 30-60 seconds to export. This is normal.
                </Typography>
                <Typography paragraph>
                  <strong>Tips:</strong>
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Export fewer entities if you don't need everything" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="CSV format is typically faster than JSON for large datasets" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Don't close the browser tab while export is processing" />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              API & Integration Questions
            </Typography>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>How do I get API access?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  <strong>Step 1:</strong> Ensure you're on Pro or Premium plan (API access
                  not available on Free plan)
                </Typography>
                <Typography paragraph>
                  <strong>Step 2:</strong> Go to Settings → API Keys
                </Typography>
                <Typography paragraph>
                  <strong>Step 3:</strong> Click "Generate New API Key"
                </Typography>
                <Typography paragraph>
                  <strong>Step 4:</strong> Copy the key immediately (shown only once)
                </Typography>
                <Typography paragraph>
                  <strong>Step 5:</strong> Use the key in Authorization header: <br />
                  <code>Authorization: Bearer ery_live_xxxxx</code>
                </Typography>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Store your API key securely. It cannot be retrieved later. If lost, you
                  must generate a new key.
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>How do webhooks work?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  Webhooks send real-time HTTP POST notifications to your server when events
                  occur:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="operation.started - When operator starts timing" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="operation.completed - When operation finishes" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="issue.created - When issue is reported" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="job.created - When new job is created" />
                  </ListItem>
                </List>
                <Typography paragraph sx={{ mt: 2 }}>
                  <strong>Setup:</strong> Go to Settings → Webhooks → Add endpoint URL →
                  Select events
                </Typography>
                <Typography paragraph>
                  <strong>Security:</strong> Each webhook includes HMAC-SHA256 signature for
                  verification
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Still Need Help?
            </Typography>

            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <EmailIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Contact Support
              </Typography>
              <Typography paragraph color="text.secondary">
                Can't find what you're looking for? Our support team is here to help.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<EmailIcon />}
                onClick={() => window.open('mailto:support@eryxonflow.com')}
              >
                Email Support
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                Response time: Within 24 hours (Pro/Premium: Within 4 hours)
              </Typography>
            </Paper>
          </Box>
        </TabPanel>
      </Paper>

      {/* Footer Links */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Additional Resources
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button size="small" href="/api-docs" startIcon={<CodeIcon />}>
            API Documentation
          </Button>
          <Button size="small" href="/pricing" startIcon={<StorageIcon />}>
            Plans & Pricing
          </Button>
          <Button
            size="small"
            onClick={() =>
              window.open('https://github.com/SheetMetalConnect/eryxon-flow', '_blank')
            }
            startIcon={<DocsIcon />}
          >
            GitHub Repository
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
