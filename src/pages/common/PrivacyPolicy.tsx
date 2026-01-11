import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Link to="/auth">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("legal.privacyPolicy.backToAbout")}
        </Button>
      </Link>

      <h1 className="text-3xl font-bold mb-2">
        {t("legal.privacyPolicy.title")}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        {t("legal.privacyPolicy.lastUpdated")}: {new Date().toLocaleDateString()}
      </p>

      <Card className="glass-card">
        <CardContent className="p-6 space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
            <p className="text-muted-foreground">
              Eryxon Flow ("we", "our", or "us") operates a Manufacturing Execution System (MES)
              for metals fabrication. This Privacy Policy explains how we collect, use, and protect
              your personal information.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Data We Collect</h2>
            <p className="text-muted-foreground mb-2">
              We collect the following information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Account Information:</strong> Email address, full name, username</li>
              <li><strong>Company Information:</strong> Company name, tenant name</li>
              <li><strong>Manufacturing Data:</strong> Jobs, parts, operations, time entries, issues, and related production data</li>
              <li><strong>Technical Data:</strong> Authentication tokens, session information</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">3. How We Use Your Data</h2>
            <p className="text-muted-foreground mb-2">
              We use your data to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Provide and operate the Eryxon Flow MES service</li>
              <li>Manage user authentication and access control</li>
              <li>Track manufacturing operations and production data</li>
              <li>Generate reports and analytics for your organization</li>
              <li>Provide customer support</li>
              <li>Improve our services</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Data Storage and Security</h2>
            <p className="text-muted-foreground mb-2">
              Your data is stored securely using Supabase infrastructure with:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Encryption:</strong> All data is encrypted in transit (HTTPS/TLS) and at rest</li>
              <li><strong>Password Security:</strong> Passwords are hashed using bcrypt</li>
              <li><strong>Access Control:</strong> Row Level Security (RLS) policies ensure tenant isolation</li>
              <li><strong>Multi-tenancy:</strong> Your data is isolated from other organizations</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Your Rights (GDPR)</h2>
            <p className="text-muted-foreground mb-2">
              Under GDPR, you have the following rights:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Right to Access:</strong> Request access to your personal data</li>
              <li><strong>Right to Portability:</strong> Export your data in CSV or JSON format via the Data Export feature</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your account and all associated data</li>
              <li><strong>Right to Rectification:</strong> Update or correct your personal information</li>
              <li><strong>Right to Restriction:</strong> Request restriction of processing</li>
              <li><strong>Right to Object:</strong> Object to processing of your data</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data for as long as your account is active. When you delete your account
              or tenant, all associated data is permanently deleted from our systems.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Data Sharing</h2>
            <p className="text-muted-foreground mb-2">
              We do not sell, trade, or rent your personal data to third parties. We only share data:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>With service providers necessary to operate our service (e.g., Supabase for hosting)</li>
              <li>When required by law or legal process</li>
              <li>With your explicit consent</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Cookies and Tracking</h2>
            <p className="text-muted-foreground">
              We use essential cookies for authentication and session management. We do not use
              tracking cookies or third-party analytics.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">9. Contact Information</h2>
            <p className="text-muted-foreground mb-4">
              For privacy-related inquiries, data access requests, or to exercise your GDPR rights,
              please visit:
            </p>
            <div className="text-muted-foreground space-y-1">
              <p><strong>Website:</strong> <a href="https://eryxon.eu" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">https://eryxon.eu</a></p>
              <p><strong>GitHub:</strong> <a href="https://github.com/SheetMetalConnect/eryxon-flow/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Report an issue</a></p>
              <p><strong>Data Controller:</strong> Sheet Metal Connect e.U.</p>
              <p><strong>Address:</strong> Dr.-Karl-Lueger-Platz 4B / 16, 1010 Vienna, Austria</p>
            </div>
            <p className="text-muted-foreground mt-4">
              {t("legal.privacyPolicy.impressumLink")}{" "}
              <a
                href="https://www.sheetmetalconnect.nl/impressum/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                {t("legal.privacyPolicy.impressumText")}
              </a>.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">10. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
