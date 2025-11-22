import {
  Container,
  Typography,
  Paper,
  Box,
  Divider,
} from "@mui/material";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Link to="/about">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("legal.privacyPolicy.backToAbout")}
        </Button>
      </Link>

      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        {t("legal.privacyPolicy.title")}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {t("legal.privacyPolicy.lastUpdated")}: {new Date().toLocaleDateString()}
      </Typography>

      <Paper sx={{ p: 4, mt: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            1. Introduction
          </Typography>
          <Typography paragraph color="text.secondary">
            Eryxon Flow ("we", "our", or "us") operates a Manufacturing Execution System (MES)
            for metals fabrication. This Privacy Policy explains how we collect, use, and protect
            your personal information.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            2. Data We Collect
          </Typography>
          <Typography paragraph color="text.secondary">
            We collect the following information:
          </Typography>
          <Typography component="div" color="text.secondary">
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li><strong>Account Information:</strong> Email address, full name, username</li>
              <li><strong>Company Information:</strong> Company name, tenant name</li>
              <li><strong>Manufacturing Data:</strong> Jobs, parts, operations, time entries, issues, and related production data</li>
              <li><strong>Technical Data:</strong> Authentication tokens, session information</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            3. How We Use Your Data
          </Typography>
          <Typography paragraph color="text.secondary">
            We use your data to:
          </Typography>
          <Typography component="div" color="text.secondary">
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Provide and operate the Eryxon Flow MES service</li>
              <li>Manage user authentication and access control</li>
              <li>Track manufacturing operations and production data</li>
              <li>Generate reports and analytics for your organization</li>
              <li>Provide customer support</li>
              <li>Improve our services</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            4. Data Storage and Security
          </Typography>
          <Typography paragraph color="text.secondary">
            Your data is stored securely using Supabase infrastructure with:
          </Typography>
          <Typography component="div" color="text.secondary">
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li><strong>Encryption:</strong> All data is encrypted in transit (HTTPS/TLS) and at rest</li>
              <li><strong>Password Security:</strong> Passwords are hashed using bcrypt</li>
              <li><strong>Access Control:</strong> Row Level Security (RLS) policies ensure tenant isolation</li>
              <li><strong>Multi-tenancy:</strong> Your data is isolated from other organizations</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            5. Your Rights (GDPR)
          </Typography>
          <Typography paragraph color="text.secondary">
            Under GDPR, you have the following rights:
          </Typography>
          <Typography component="div" color="text.secondary">
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li><strong>Right to Access:</strong> Request access to your personal data</li>
              <li><strong>Right to Portability:</strong> Export your data in CSV or JSON format via the Data Export feature</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your account and all associated data</li>
              <li><strong>Right to Rectification:</strong> Update or correct your personal information</li>
              <li><strong>Right to Restriction:</strong> Request restriction of processing</li>
              <li><strong>Right to Object:</strong> Object to processing of your data</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            6. Data Retention
          </Typography>
          <Typography paragraph color="text.secondary">
            We retain your data for as long as your account is active. When you delete your account
            or tenant, all associated data is permanently deleted from our systems.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            7. Data Sharing
          </Typography>
          <Typography paragraph color="text.secondary">
            We do not sell, trade, or rent your personal data to third parties. We only share data:
          </Typography>
          <Typography component="div" color="text.secondary">
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>With service providers necessary to operate our service (e.g., Supabase for hosting)</li>
              <li>When required by law or legal process</li>
              <li>With your explicit consent</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            8. Cookies and Tracking
          </Typography>
          <Typography paragraph color="text.secondary">
            We use essential cookies for authentication and session management. We do not use
            tracking cookies or third-party analytics.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            9. Contact Information
          </Typography>
          <Typography paragraph color="text.secondary">
            For privacy-related inquiries, data access requests, or to exercise your GDPR rights,
            please contact us at:
          </Typography>
          <Typography paragraph color="text.secondary">
            <strong>Email:</strong> luke@sheetmetalconnect.com
          </Typography>
          <Typography paragraph color="text.secondary">
            <strong>Data Controller:</strong> Sheet Metal Connect e.U.
          </Typography>
          <Typography paragraph color="text.secondary">
            <strong>Address:</strong> Dr.-Karl-Lueger-Platz 4B / 16, 1010 Vienna, Austria
          </Typography>
          <Typography paragraph color="text.secondary">
            <strong>Contact Person:</strong> Luke van Enkhuizen
          </Typography>
          <Typography paragraph color="text.secondary" sx={{ mt: 2 }}>
            {t("legal.privacyPolicy.impressumLink")}{" "}
            <Link
              href="https://www.sheetmetalconnect.nl/impressum/"
              target="_blank"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              {t("legal.privacyPolicy.impressumText")}
            </Link>.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="h6" gutterBottom fontWeight="600">
            10. Changes to This Policy
          </Typography>
          <Typography paragraph color="text.secondary">
            We may update this Privacy Policy from time to time. We will notify you of any
            changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
