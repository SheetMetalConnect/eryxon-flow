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

export default function TermsOfService() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Link to="/about">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to About
        </Button>
      </Link>

      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        Terms of Service
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Last updated: {new Date().toLocaleDateString()}
      </Typography>

      <Paper sx={{ p: 4, mt: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            1. Acceptance of Terms
          </Typography>
          <Typography paragraph color="text.secondary">
            By accessing and using Eryxon Flow ("the Service"), you accept and agree to be bound
            by these Terms of Service. If you do not agree to these terms, please do not use the Service.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            2. Description of Service
          </Typography>
          <Typography paragraph color="text.secondary">
            Eryxon Flow is a Manufacturing Execution System (MES) designed for metals fabrication
            businesses. The Service provides tools for tracking jobs, parts, operations, time entries,
            and production issues through various stages of manufacturing.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            3. User Accounts
          </Typography>
          <Typography paragraph color="text.secondary">
            You are responsible for:
          </Typography>
          <Typography component="div" color="text.secondary">
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Ensuring all information provided is accurate and current</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            4. Acceptable Use
          </Typography>
          <Typography paragraph color="text.secondary">
            You agree NOT to:
          </Typography>
          <Typography component="div" color="text.secondary">
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Use the Service for any illegal purposes</li>
              <li>Attempt to gain unauthorized access to the Service or other users' data</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Violate the privacy or rights of other users</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Use the Service to compete with us</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            5. Data Ownership
          </Typography>
          <Typography paragraph color="text.secondary">
            You retain all rights to the data you input into the Service. We do not claim ownership
            of your manufacturing data, customer information, or any content you create.
          </Typography>
          <Typography paragraph color="text.secondary">
            You grant us a license to use your data solely for the purpose of providing the Service
            to you.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            6. Service Availability
          </Typography>
          <Typography paragraph color="text.secondary">
            We strive to provide reliable service, but we do not guarantee:
          </Typography>
          <Typography component="div" color="text.secondary">
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Uninterrupted or error-free operation</li>
              <li>That the Service will meet all your requirements</li>
              <li>That defects will be corrected immediately</li>
            </ul>
          </Typography>
          <Typography paragraph color="text.secondary">
            We reserve the right to modify or discontinue the Service with reasonable notice.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            7. Subscription and Payment
          </Typography>
          <Typography paragraph color="text.secondary">
            Service plans and pricing are described on our Pricing page. By subscribing to a paid plan:
          </Typography>
          <Typography component="div" color="text.secondary">
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>You agree to pay the fees for your selected plan</li>
              <li>Fees are billed in advance on a recurring basis</li>
              <li>You authorize us to charge your payment method</li>
              <li>Refunds are subject to our refund policy</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            8. Termination
          </Typography>
          <Typography paragraph color="text.secondary">
            You may terminate your account at any time through the Settings page. We may suspend
            or terminate your access if:
          </Typography>
          <Typography component="div" color="text.secondary">
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>You violate these Terms of Service</li>
              <li>Your account is inactive for an extended period</li>
              <li>Payment is not received</li>
              <li>We discontinue the Service</li>
            </ul>
          </Typography>
          <Typography paragraph color="text.secondary">
            Upon termination, you may export your data using the Data Export feature. After account
            deletion, all data is permanently removed from our systems.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            9. Limitation of Liability
          </Typography>
          <Typography paragraph color="text.secondary">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW:
          </Typography>
          <Typography component="div" color="text.secondary">
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>The Service is provided "AS IS" without warranties of any kind</li>
              <li>We are not liable for any indirect, incidental, or consequential damages</li>
              <li>Our total liability is limited to the amount you paid us in the past 12 months</li>
              <li>We are not responsible for loss of data, profits, or business interruption</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            10. Indemnification
          </Typography>
          <Typography paragraph color="text.secondary">
            You agree to indemnify and hold us harmless from any claims, damages, or expenses
            arising from your use of the Service, violation of these terms, or infringement of
            any third-party rights.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            11. Governing Law
          </Typography>
          <Typography paragraph color="text.secondary">
            These Terms are governed by the laws of Austria, without regard
            to conflict of law provisions. Any disputes shall be resolved in the courts of
            Vienna, Austria.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            12. Changes to Terms
          </Typography>
          <Typography paragraph color="text.secondary">
            We reserve the right to modify these Terms at any time. We will notify you of
            material changes by email or through the Service. Continued use after changes
            constitutes acceptance of the new Terms.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="h6" gutterBottom fontWeight="600">
            13. Contact Information
          </Typography>
          <Typography paragraph color="text.secondary">
            For questions about these Terms, please contact us at:
          </Typography>
          <Typography paragraph color="text.secondary">
            <strong>Email:</strong> luke@sheetmetalconnect.com
          </Typography>
          <Typography paragraph color="text.secondary">
            <strong>Company:</strong> Sheet Metal Connect e.U.
          </Typography>
          <Typography paragraph color="text.secondary">
            <strong>Address:</strong> Dr.-Karl-Lueger-Platz 4B / 16, 1010 Vienna, Austria
          </Typography>
          <Typography paragraph color="text.secondary">
            <strong>Contact Person:</strong> Luke van Enkhuizen
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
