import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Link,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
} from "@mui/icons-material";

export default function Help() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        Help
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="600">
          Getting Started
        </Typography>
        <Typography paragraph color="text.secondary">
          Jobs contain parts, parts have operations. Operators track time and mark complete.
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
            <ListItemText primary="Configure cells and materials (Settings)" />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
            <ListItemText primary="Create users (Settings → Users)" />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
            <ListItemText primary="Create jobs via UI or API" />
          </ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="600">
          Operators
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
            <ListItemText primary="View Work Queue, filter by material/cell/status" />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
            <ListItemText primary="Start Timing → work → Stop Timing → Complete" />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
            <ListItemText primary="View STEP/PDF files, report issues with photos" />
          </ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="600">
          Admins
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
            <ListItemText primary="Create jobs, parts, operations" />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
            <ListItemText primary="Assign work, review issues" />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
            <ListItemText primary="Configure cells, materials, API keys, webhooks" />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
            <ListItemText primary="Export data (JSON/CSV)" />
          </ListItem>
        </List>
      </Paper>

      <Divider sx={{ my: 3 }} />

      <Box>
        <Typography variant="body2" color="text.secondary">
          <Link href="/admin/api-docs">API Documentation</Link> · <Link href="https://github.com/SheetMetalConnect/eryxon-flow" target="_blank">GitHub</Link>
        </Typography>
      </Box>
    </Container>
  );
}
