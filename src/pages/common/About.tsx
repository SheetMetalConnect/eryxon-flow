import {
  Box,
  Container,
  Typography,
  Paper,
  Link,
  Divider,
} from "@mui/material";

export default function About() {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        About
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="600">
          Eryxon MES
        </Typography>
        <Typography paragraph color="text.secondary">
          Manufacturing execution system for metals fabrication. Track jobs, parts, and operations through production.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Made by <Link href="https://sheetmetalconnect.com" target="_blank">Sheet Metal Connect</Link>
        </Typography>
      </Paper>

      <Divider sx={{ my: 3 }} />

      <Box>
        <Typography variant="body2" color="text.secondary">
          <Link href="/admin/help">Help</Link> · <Link href="/admin/api-docs">API Docs</Link> · <Link href="https://github.com/SheetMetalConnect/eryxon-flow" target="_blank">GitHub</Link>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Privacy Policy · Terms of Service
        </Typography>
      </Box>
    </Container>
  );
}
