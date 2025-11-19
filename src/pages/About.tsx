import { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  Build as BuildIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Visibility as VisibilityIcon,
  Api as ApiIcon,
  Timer as TimerIcon,
  BugReport as BugReportIcon,
  ViewInAr as ViewInArIcon,
  Webhook as WebhookIcon,
  DragIndicator as DragIcon,
  Groups as GroupsIcon,
  Factory as FactoryIcon,
  MonetizationOn as PricingIcon,
  Help as HelpIcon,
  Description as DocsIcon,
} from "@mui/icons-material";

export default function About() {
  const [expanded, setExpanded] = useState<string | false>("panel1");

  const handleChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Eryxon MES
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: "auto" }}>
          The simple, elegant, and powerful manufacturing execution system that your people will love to use. Made for metals fabrication.
        </Typography>
      </Box>

      {/* Quick Links */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardActionArea href="/admin/help">
              <CardContent sx={{ textAlign: "center", py: 3 }}>
                <HelpIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Help Guide
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Learn how to use Eryxon
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardActionArea href="/admin/api-docs">
              <CardContent sx={{ textAlign: "center", py: 3 }}>
                <CodeIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  API Docs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Integration reference
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardActionArea href="/admin/pricing">
              <CardContent sx={{ textAlign: "center", py: 3 }}>
                <PricingIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Pricing
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Plans and features
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardActionArea
              onClick={() =>
                window.open(
                  "https://github.com/SheetMetalConnect/eryxon-flow",
                  "_blank",
                )
              }
            >
              <CardContent sx={{ textAlign: "center", py: 3 }}>
                <DocsIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  GitHub
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Source and docs
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper elevation={1} sx={{ mb: 4 }}>
        {/* What It Does */}
        <Accordion expanded={expanded === "panel1"} onChange={handleChange("panel1")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <FactoryIcon color="primary" />
              <Typography variant="h6" fontWeight="600">What It Does</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography paragraph>
              Eryxon tracks jobs, parts, and operations through production with a mobile and tablet-first interface. Data comes from your ERP via API.
            </Typography>

            <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ mt: 2 }}>
              For Operators
            </Typography>
            <Typography paragraph>
              The interface shows what to work on, grouped by materials and manufacturing stages (cells)—organized the way your shop runs. Visual indicators (colors, badges) make tasks instantly recognizable. STEP file viewer shows the 3D geometry. PDF viewer shows the drawings. Start and stop time on operations. Report issues when something's wrong. Everything needed, nothing extra.
            </Typography>

            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              For Admins
            </Typography>
            <Typography paragraph>
              See who's working on what in real-time. Assign specific parts to specific operators. Review and approve issues. Configure cells, materials, resources, and templates. Real visibility into shopfloor activity without walking the floor.
            </Typography>

            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              Work Organization
            </Typography>
            <Typography paragraph>
              Work displayed kanban-style with visual columns per cell. Operators see what's available and pull work when ready. Cells represent manufacturing zones (Cutting, Bending, Welding, Assembly, etc.).
            </Typography>

            <Typography paragraph>
              Quick Response Manufacturing (QRM) principles built in: visual indicators show when too many jobs or parts are in the same cell. Track progress by cell completion. Real-time updates—changes appear immediately on all screens via WebSocket.
            </Typography>

            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              Flexible Data
            </Typography>
            <Typography paragraph>
              Jobs, parts, and operations support custom JSON metadata—machine settings, bend sequences, welding parameters. Define reusable resources like molds, tooling, fixtures, or materials, then link them to work. Operators see what's required and any custom instructions in the operation view.
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Key Features */}
        <Accordion expanded={expanded === "panel2"} onChange={handleChange("panel2")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <SpeedIcon color="primary" />
              <Typography variant="h6" fontWeight="600">Key Features</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom fontWeight="600">
                      <TimerIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                      Time Tracking
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Track actual time vs. estimated time per operation. Pause and resume as needed—pause time is tracked separately and excluded from effective work time.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom fontWeight="600">
                      <BugReportIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                      Issue Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Report production issues (NCRs) from active operations with description, severity, and photos. Workflow: pending → approved/rejected → closed. Issues are informational—they don't block work.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom fontWeight="600">
                      <ViewInArIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                      3D CAD Viewer
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      View STEP files directly in browser with interactive 3D controls, wireframe mode, and exploded views. Files up to 50MB supported.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom fontWeight="600">
                      <ApiIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                      API Integration
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      100% API-driven. REST API for creating jobs/parts/operations. Webhooks for real-time event notifications. MCP server for AI/automation integration.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom fontWeight="600">
                      <VisibilityIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                      Real-Time Visibility
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Dashboard shows active workers, pending issues, in-progress tasks, jobs due this week. QRM metrics visualize work distribution across cells.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom fontWeight="600">
                      <DragIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                      Assembly Tracking
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Parts can have parent-child relationships. Visual grouping shows assemblies with nested components. Assembly hierarchy helps organize complex builds.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Users & Roles */}
        <Accordion expanded={expanded === "panel3"} onChange={handleChange("panel3")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <GroupsIcon color="primary" />
              <Typography variant="h6" fontWeight="600">Users & Roles</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  Operators
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="View work queue filtered by material, cell, status" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Start/stop time tracking on operations" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Pause timer during breaks" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Mark operations complete" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="View STEP/PDF files" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Report issues with photos" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Review their activity history" />
                  </ListItem>
                </List>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  Admins
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Everything operators can do" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Create and manage jobs, parts, operations" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Assign parts to operators" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Approve/reject/close issues" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Configure cells, materials, resources" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Manage users and API keys" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Configure webhooks and templates" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Export data (JSON/CSV)" />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* What We Don't Do */}
        <Accordion expanded={expanded === "panel4"} onChange={handleChange("panel4")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <CancelIcon color="error" />
              <Typography variant="h6" fontWeight="600">What We Don't Do (By Design)</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              <ListItem>
                <ListItemIcon><CancelIcon color="error" fontSize="small" /></ListItemIcon>
                <ListItemText
                  primary="No financial tracking"
                  secondary="We track time spent on work, not costs, prices, or margins."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CancelIcon color="error" fontSize="small" /></ListItemIcon>
                <ListItemText
                  primary="No purchasing"
                  secondary="Operations can be marked as external (subcontract) and tracked via API, but no PO management."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CancelIcon color="error" fontSize="small" /></ListItemIcon>
                <ListItemText
                  primary="No BOM management"
                  secondary="We track what to produce, not item details or inventory. Parts can have parent-child links for assembly visualization only."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CancelIcon color="error" fontSize="small" /></ListItemIcon>
                <ListItemText
                  primary="No scheduling"
                  secondary="Due dates come from your ERP. We display and filter by them but don't calculate or optimize schedules."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CancelIcon color="error" fontSize="small" /></ListItemIcon>
                <ListItemText
                  primary="No built-in reports"
                  secondary="Real-time stats and QRM dashboard only. All data accessible via API for your own reporting."
                />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Technical Stack */}
        <Accordion expanded={expanded === "panel5"} onChange={handleChange("panel5")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <BuildIcon color="primary" />
              <Typography variant="h6" fontWeight="600">Technical Stack</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <List dense>
                  <ListItem>
                    <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="Frontend"
                      secondary="React + TypeScript, Material UI + shadcn/ui, Tailwind CSS"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><StorageIcon fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="Backend"
                      secondary="Supabase (PostgreSQL, Edge Functions, Realtime, Storage)"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><SecurityIcon fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="Auth"
                      secondary="JWT-based with role-based access control (RLS)"
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <List dense>
                  <ListItem>
                    <ListItemIcon><StorageIcon fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="Files"
                      secondary="Supabase Storage with signed URLs"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><ViewInArIcon fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="STEP Viewer"
                      secondary="occt-import-js + Three.js for client-side rendering"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><WebhookIcon fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="Integration"
                      secondary="REST API, webhooks, MCP server"
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Security & Multi-Tenancy */}
        <Accordion expanded={expanded === "panel6"} onChange={handleChange("panel6")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <SecurityIcon color="primary" />
              <Typography variant="h6" fontWeight="600">Multi-Tenancy & Security</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              Free & Pro Tiers
            </Typography>
            <Typography paragraph>
              Multi-tenant architecture with complete data isolation per tenant. Row-level security (RLS) enforces separation at the database level. No tenant can access another tenant's data.
            </Typography>

            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              Premium Tier
            </Typography>
            <Typography paragraph>
              Single-tenant deployment. Dedicated infrastructure, completely air-gapped. Zero data sharing with other customers.
            </Typography>

            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              All Tiers
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                <ListItemText primary="HTTPS traffic only" />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                <ListItemText primary="Passwords hashed" />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                <ListItemText primary="API keys encrypted" />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                <ListItemText primary="File access time-limited via signed URLs" />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Pricing Model */}
        <Accordion expanded={expanded === "panel7"} onChange={handleChange("panel7")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <PricingIcon color="primary" />
              <Typography variant="h6" fontWeight="600">Pricing Model</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Free</Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      All features, limited usage. Self-service signup.
                    </Typography>
                    <Chip label="100 jobs/month" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    <Chip label="1,000 parts/month" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    <Chip label="5GB storage" size="small" sx={{ mb: 0.5 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined" sx={{ borderColor: "primary.main" }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Pro <Chip label="$97/mo" size="small" /></Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Full usage with tiered storage. Self-service.
                    </Typography>
                    <Chip label="1,000 jobs/month" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    <Chip label="10,000 parts/month" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    <Chip label="50GB storage" size="small" sx={{ mb: 0.5 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Premium</Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Enterprise tier with SSO, self-hosted, unlimited.
                    </Typography>
                    <Chip label="Unlimited" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    <Chip label="SSO" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    <Chip label="Self-hosted" size="small" sx={{ mb: 0.5 }} />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              SaaS, Self-Service Only
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No onboarding calls. No consultants. No phone support. Sign up, configure your cells and materials, connect your API, and go. Documentation and email support only.
            </Typography>

            <Box sx={{ mt: 2 }}>
              <Button variant="contained" href="/admin/pricing">
                View Full Pricing Details
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Footer */}
      <Box sx={{ mt: 4, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Need help getting started?
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Button size="small" href="/admin/help" startIcon={<HelpIcon />}>
            Help & Documentation
          </Button>
          <Button size="small" href="/admin/api-docs" startIcon={<CodeIcon />}>
            API Documentation
          </Button>
          <Button
            size="small"
            onClick={() =>
              window.open("mailto:support@eryxonflow.com", "_blank")
            }
          >
            Contact Support
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
