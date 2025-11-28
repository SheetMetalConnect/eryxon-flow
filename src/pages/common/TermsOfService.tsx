import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";

export default function TermsOfService() {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Link to="/about">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("legal.termsOfService.backToAbout")}
        </Button>
      </Link>

      <h1 className="text-3xl font-bold mb-2">
        {t("legal.termsOfService.title")}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        {t("legal.termsOfService.lastUpdated")}: {new Date().toLocaleDateString()}
      </p>

      <Card className="glass-card">
        <CardContent className="p-6 space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using Eryxon Flow ("the Service"), you accept and agree to be bound
              by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Description of Service</h2>
            <p className="text-muted-foreground">
              Eryxon Flow is a Manufacturing Execution System (MES) designed for metals fabrication
              businesses. The Service provides tools for tracking jobs, parts, operations, time entries,
              and production issues through various stages of manufacturing.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">3. User Accounts</h2>
            <p className="text-muted-foreground mb-2">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Ensuring all information provided is accurate and current</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Acceptable Use</h2>
            <p className="text-muted-foreground mb-2">
              You agree NOT to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Use the Service for any illegal purposes</li>
              <li>Attempt to gain unauthorized access to the Service or other users' data</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Violate the privacy or rights of other users</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Use the Service to compete with us</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Data Ownership</h2>
            <p className="text-muted-foreground mb-2">
              You retain all rights to the data you input into the Service. We do not claim ownership
              of your manufacturing data, customer information, or any content you create.
            </p>
            <p className="text-muted-foreground">
              You grant us a license to use your data solely for the purpose of providing the Service
              to you.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Service Availability</h2>
            <p className="text-muted-foreground mb-2">
              We strive to provide reliable service, but we do not guarantee:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Uninterrupted or error-free operation</li>
              <li>That the Service will meet all your requirements</li>
              <li>That defects will be corrected immediately</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              We reserve the right to modify or discontinue the Service with reasonable notice.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Subscription and Payment</h2>
            <p className="text-muted-foreground mb-2">
              Service plans and pricing are described on our Pricing page. By subscribing to a paid plan:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>You agree to pay the fees for your selected plan</li>
              <li>Fees are billed in advance on a recurring basis</li>
              <li>You authorize us to charge your payment method</li>
              <li>Refunds are subject to our refund policy</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Termination</h2>
            <p className="text-muted-foreground mb-2">
              You may terminate your account at any time through the Settings page. We may suspend
              or terminate your access if:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>You violate these Terms of Service</li>
              <li>Your account is inactive for an extended period</li>
              <li>Payment is not received</li>
              <li>We discontinue the Service</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Upon termination, you may export your data using the Data Export feature. After account
              deletion, all data is permanently removed from our systems.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">9. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-2">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>The Service is provided "AS IS" without warranties of any kind</li>
              <li>We are not liable for any indirect, incidental, or consequential damages</li>
              <li>Our total liability is limited to the amount you paid us in the past 12 months</li>
              <li>We are not responsible for loss of data, profits, or business interruption</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">10. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold us harmless from any claims, damages, or expenses
              arising from your use of the Service, violation of these terms, or infringement of
              any third-party rights.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">11. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of Austria, without regard
              to conflict of law provisions. Any disputes shall be resolved in the courts of
              Vienna, Austria.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">12. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will notify you of
              material changes by email or through the Service. Continued use after changes
              constitutes acceptance of the new Terms.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">13. Contact Information</h2>
            <p className="text-muted-foreground mb-4">
              For questions about these Terms, please contact us at:
            </p>
            <div className="text-muted-foreground space-y-1">
              <p><strong>Email:</strong> luke@sheetmetalconnect.com</p>
              <p><strong>Company:</strong> Sheet Metal Connect e.U.</p>
              <p><strong>Address:</strong> Dr.-Karl-Lueger-Platz 4B / 16, 1010 Vienna, Austria</p>
              <p><strong>Contact Person:</strong> Luke van Enkhuizen</p>
            </div>
            <p className="text-muted-foreground mt-4">
              {t("legal.termsOfService.impressumLink")}{" "}
              <a
                href="https://www.sheetmetalconnect.nl/impressum/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                {t("legal.termsOfService.impressumText")}
              </a>.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
