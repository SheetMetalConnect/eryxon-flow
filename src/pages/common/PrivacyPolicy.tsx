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
        {t("legal.privacyPolicy.lastUpdated")}: 11 January 2026
      </p>

      <Card className="glass-card">
        <CardContent className="p-6 space-y-6">
          {/* Data Controller Information */}
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Data Controller</h2>
            <p className="text-muted-foreground mb-2">
              The data controller responsible for your personal data is:
            </p>
            <div className="text-muted-foreground space-y-1">
              <p><strong>Sheet Metal Connect e.U.</strong></p>
              <p><strong>Owner:</strong> Luke van Enkhuizen</p>
              <p><strong>Address:</strong> Dr.-Karl-Lueger-Platz 4B / 16, 1010 Vienna, Austria</p>
              <p><strong>UID Number:</strong> ATU74556919</p>
              <p><strong>Commercial Register:</strong> FN 547850m</p>
              <p><strong>Commercial Court:</strong> Handelsgericht Wien, 1030 Wien, Marxergasse 1a</p>
              <p><strong>Email:</strong> luke@sheetmetalconnect.com</p>
            </div>
            <p className="text-muted-foreground mt-2">
              For any questions regarding data protection, please contact us at the email address above.
            </p>
          </section>

          <Separator />

          {/* Alpha Trial Notice */}
          <section className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2 text-yellow-500">2. Alpha Trial Data Notice</h2>
            <p className="text-muted-foreground mb-2">
              <strong>Important:</strong> Eryxon Flow is currently in Alpha Trial. During this period:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>All data stored in the Service may be deleted at any time without prior notice</li>
              <li>Data may be deleted during system updates, migrations, or service discontinuation</li>
              <li>Users should regularly export their data using the Data Export feature</li>
              <li>The Controller is not liable for any data loss during the alpha trial period</li>
            </ul>
          </section>

          <Separator />

          {/* Introduction */}
          <section>
            <h2 className="text-lg font-semibold mb-2">3. Introduction</h2>
            <p className="text-muted-foreground mb-2">
              Sheet Metal Connect e.U. ("we", "us", or "the Controller") operates Eryxon Flow, a cloud-based Manufacturing Execution System (MES) for metals fabrication businesses ("the Service").
            </p>
            <p className="text-muted-foreground mb-2">
              This Privacy Policy explains how we collect, use, store, and protect your personal data in accordance with the General Data Protection Regulation (EU) 2016/679 ("GDPR") and the Austrian Data Protection Act (Datenschutzgesetz - DSG).
            </p>
            <p className="text-muted-foreground">
              By using our Service, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </section>

          <Separator />

          {/* Data We Collect */}
          <section>
            <h2 className="text-lg font-semibold mb-2">4. Categories of Personal Data We Collect</h2>
            <p className="text-muted-foreground mb-2">
              We collect and process the following categories of personal data:
            </p>

            <h3 className="font-medium mt-4 mb-2">4.1 Account Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Email address</strong> - For account identification and communication</li>
              <li><strong>Full name</strong> - For personalization and identification</li>
              <li><strong>Password</strong> - Stored as a secure hash (never in plain text)</li>
              <li><strong>Company name</strong> - For organization management (optional)</li>
            </ul>

            <h3 className="font-medium mt-4 mb-2">4.2 Organization Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Tenant/Organization name</strong> - For multi-tenant isolation</li>
              <li><strong>User roles and permissions</strong> - For access control</li>
              <li><strong>Operator profiles</strong> - Employee ID, PIN (hashed), display name</li>
            </ul>

            <h3 className="font-medium mt-4 mb-2">4.3 Manufacturing Data (Customer Data)</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Jobs, parts, and operations data</li>
              <li>Time entries and production records</li>
              <li>Quality control and issue reports</li>
              <li>Customer and order references you create</li>
            </ul>

            <h3 className="font-medium mt-4 mb-2">4.4 Technical Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Authentication tokens</strong> - For session management</li>
              <li><strong>IP addresses</strong> - For security and abuse prevention (not stored long-term)</li>
              <li><strong>Browser type and version</strong> - For compatibility and debugging</li>
              <li><strong>Access timestamps</strong> - For security auditing</li>
            </ul>
          </section>

          <Separator />

          {/* Legal Basis */}
          <section>
            <h2 className="text-lg font-semibold mb-2">5. Legal Basis for Processing (Article 6 GDPR)</h2>
            <p className="text-muted-foreground mb-2">
              We process your personal data based on the following legal grounds:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong>Contract Performance (Art. 6(1)(b) GDPR):</strong> Processing necessary for the performance of our Service agreement with you, including account management, providing the MES functionality, and customer support.
              </li>
              <li>
                <strong>Legitimate Interests (Art. 6(1)(f) GDPR):</strong> Processing necessary for our legitimate interests, including service security, fraud prevention, service improvement, and analytics. Our legitimate interests do not override your fundamental rights and freedoms.
              </li>
              <li>
                <strong>Legal Obligations (Art. 6(1)(c) GDPR):</strong> Processing necessary to comply with legal obligations, such as tax and accounting requirements, or responding to lawful requests from authorities.
              </li>
              <li>
                <strong>Consent (Art. 6(1)(a) GDPR):</strong> Where we rely on consent for specific processing activities (e.g., marketing communications), you may withdraw your consent at any time without affecting the lawfulness of processing prior to withdrawal.
              </li>
            </ul>
          </section>

          <Separator />

          {/* Purposes */}
          <section>
            <h2 className="text-lg font-semibold mb-2">6. Purposes of Processing</h2>
            <p className="text-muted-foreground mb-2">
              We use your personal data for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Providing and operating the Eryxon Flow MES service</li>
              <li>Creating and managing your user account</li>
              <li>Authenticating users and managing access control</li>
              <li>Processing and tracking manufacturing operations on your behalf</li>
              <li>Generating reports and analytics for your organization</li>
              <li>Providing customer support and responding to inquiries</li>
              <li>Sending service-related communications (account notifications, security alerts)</li>
              <li>Ensuring the security and integrity of our Service</li>
              <li>Improving and developing our Service</li>
              <li>Complying with legal and regulatory obligations</li>
            </ul>
          </section>

          <Separator />

          {/* Data Storage and Security */}
          <section>
            <h2 className="text-lg font-semibold mb-2">7. Data Storage and Security</h2>

            <h3 className="font-medium mt-4 mb-2">7.1 Infrastructure</h3>
            <p className="text-muted-foreground mb-2">
              Your data is stored and processed using Supabase infrastructure, hosted within the European Union (EU) to ensure GDPR compliance.
            </p>

            <h3 className="font-medium mt-4 mb-2">7.2 Security Measures</h3>
            <p className="text-muted-foreground mb-2">
              We implement appropriate technical and organizational measures to protect your data:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Encryption in Transit:</strong> All data transmitted between your device and our servers is encrypted using TLS 1.2 or higher (HTTPS)</li>
              <li><strong>Encryption at Rest:</strong> Data stored in our databases is encrypted using AES-256 encryption</li>
              <li><strong>Password Security:</strong> Passwords are hashed using bcrypt with salting; we never store plain-text passwords</li>
              <li><strong>Access Control:</strong> Row Level Security (RLS) policies ensure strict tenant isolation</li>
              <li><strong>Multi-tenancy:</strong> Your data is logically separated from other organizations</li>
              <li><strong>Regular Backups:</strong> Automated backups with encryption</li>
              <li><strong>Monitoring:</strong> Security monitoring and logging for anomaly detection</li>
            </ul>

            <h3 className="font-medium mt-4 mb-2">7.3 Data Breach Notification</h3>
            <p className="text-muted-foreground">
              In the event of a personal data breach that poses a high risk to your rights and freedoms, we will notify you without undue delay in accordance with Article 34 GDPR. We will also notify the Austrian Data Protection Authority (Datenschutzbehörde) within 72 hours of becoming aware of a breach as required by Article 33 GDPR.
            </p>
          </section>

          <Separator />

          {/* Data Retention */}
          <section>
            <h2 className="text-lg font-semibold mb-2">8. Data Retention</h2>
            <p className="text-muted-foreground mb-2">
              We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Active Account:</strong> Data is retained for the duration of your account being active</li>
              <li><strong>Account Deletion:</strong> Upon account or tenant deletion, personal data is permanently deleted within 30 days, except where retention is required by law</li>
              <li><strong>Legal Requirements:</strong> Certain data may be retained longer to comply with tax, accounting, or other legal obligations (typically 7 years for financial records under Austrian law)</li>
              <li><strong>Backups:</strong> Data may persist in encrypted backups for up to 30 days after deletion</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              <strong>Alpha Trial:</strong> During the alpha trial period, data may be deleted at any time at our discretion for system maintenance or updates.
            </p>
          </section>

          <Separator />

          {/* Your Rights */}
          <section>
            <h2 className="text-lg font-semibold mb-2">9. Your Rights Under GDPR</h2>
            <p className="text-muted-foreground mb-2">
              Under the GDPR, you have the following rights regarding your personal data:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong>Right of Access (Art. 15):</strong> You have the right to request confirmation of whether we process your personal data and to receive a copy of that data.
              </li>
              <li>
                <strong>Right to Rectification (Art. 16):</strong> You have the right to request correction of inaccurate personal data or completion of incomplete data. You can update most information directly in your account settings.
              </li>
              <li>
                <strong>Right to Erasure (Art. 17):</strong> You have the right to request deletion of your personal data under certain circumstances ("right to be forgotten"). You can delete your account through Settings, which triggers deletion of all associated data.
              </li>
              <li>
                <strong>Right to Restriction (Art. 18):</strong> You have the right to request restriction of processing of your personal data under certain circumstances.
              </li>
              <li>
                <strong>Right to Data Portability (Art. 20):</strong> You have the right to receive your personal data in a structured, commonly used, machine-readable format (CSV, JSON). Use the Data Export feature in your account to export your data at any time.
              </li>
              <li>
                <strong>Right to Object (Art. 21):</strong> You have the right to object to processing based on legitimate interests. We will cease processing unless we demonstrate compelling legitimate grounds.
              </li>
              <li>
                <strong>Right to Withdraw Consent (Art. 7(3)):</strong> Where processing is based on consent, you have the right to withdraw consent at any time without affecting the lawfulness of prior processing.
              </li>
              <li>
                <strong>Right to Lodge a Complaint:</strong> You have the right to lodge a complaint with a supervisory authority, particularly in the EU Member State of your residence, place of work, or place of the alleged infringement.
              </li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>How to Exercise Your Rights:</strong> To exercise any of these rights, please contact us at luke@sheetmetalconnect.com. We will respond to your request within one month. In complex cases, this period may be extended by two additional months, and we will inform you of any such extension.
            </p>
          </section>

          <Separator />

          {/* Data Sharing */}
          <section>
            <h2 className="text-lg font-semibold mb-2">10. Data Sharing and Recipients</h2>
            <p className="text-muted-foreground mb-2">
              <strong>We do not sell, trade, or rent your personal data to third parties.</strong> We share data only in the following circumstances:
            </p>

            <h3 className="font-medium mt-4 mb-2">10.1 Service Providers (Sub-processors)</h3>
            <p className="text-muted-foreground mb-2">
              We use the following third-party service providers who process data on our behalf:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Supabase (EU):</strong> Database hosting, authentication, and storage</li>
              <li><strong>Resend:</strong> Transactional email delivery (for account notifications)</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              All sub-processors are bound by Data Processing Agreements (DPAs) that ensure GDPR-compliant data handling.
            </p>

            <h3 className="font-medium mt-4 mb-2">10.2 Legal Requirements</h3>
            <p className="text-muted-foreground">
              We may disclose personal data when required by law, court order, or governmental regulation, or when necessary to protect our rights, property, or safety.
            </p>

            <h3 className="font-medium mt-4 mb-2">10.3 Business Transfers</h3>
            <p className="text-muted-foreground">
              In the event of a merger, acquisition, or sale of assets, personal data may be transferred to the successor entity, subject to the same privacy protections.
            </p>
          </section>

          <Separator />

          {/* International Transfers */}
          <section>
            <h2 className="text-lg font-semibold mb-2">11. International Data Transfers</h2>
            <p className="text-muted-foreground mb-2">
              Your data is primarily stored and processed within the European Union. If data is transferred outside the EEA, we ensure appropriate safeguards are in place:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>EU-US Data Privacy Framework (for US-based sub-processors)</li>
              <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
              <li>Adequacy decisions by the European Commission</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              You may request information about the safeguards we use for international transfers by contacting us.
            </p>
          </section>

          <Separator />

          {/* Cookies */}
          <section>
            <h2 className="text-lg font-semibold mb-2">12. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground mb-2">
              We use only <strong>strictly necessary cookies</strong> for the operation of our Service:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Authentication cookies:</strong> To maintain your logged-in session</li>
              <li><strong>Session cookies:</strong> For security and functionality</li>
              <li><strong>Preference cookies:</strong> To remember your language and theme settings</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              <strong>We do not use:</strong> Third-party tracking cookies, advertising cookies, or analytics cookies that track individual users. We use Fathom Analytics, a privacy-preserving analytics tool that is fully GDPR-compliant and does not use cookies or track personal data.
            </p>
          </section>

          <Separator />

          {/* Children */}
          <section>
            <h2 className="text-lg font-semibold mb-2">13. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our Service is not intended for individuals under 16 years of age. We do not knowingly collect personal data from children. If we become aware that we have collected personal data from a child under 16, we will take steps to delete that information promptly.
            </p>
          </section>

          <Separator />

          {/* DPA Information */}
          <section>
            <h2 className="text-lg font-semibold mb-2">14. Data Processing Agreement (For Business Customers)</h2>
            <p className="text-muted-foreground mb-2">
              When you use Eryxon Flow to process personal data of your employees, customers, or other third parties, you act as the Data Controller and we act as the Data Processor under Article 28 GDPR.
            </p>
            <p className="text-muted-foreground mb-2">
              By using the Service, you agree that:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>We process personal data only on your documented instructions</li>
              <li>We ensure that persons authorized to process data are committed to confidentiality</li>
              <li>We implement appropriate technical and organizational security measures</li>
              <li>We assist you in responding to data subject requests</li>
              <li>We assist you in ensuring compliance with security and breach notification obligations</li>
              <li>We delete or return personal data at the end of the service relationship</li>
              <li>We make available information necessary to demonstrate compliance</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              A formal Data Processing Agreement is available upon request for enterprise customers.
            </p>
          </section>

          <Separator />

          {/* Supervisory Authority */}
          <section>
            <h2 className="text-lg font-semibold mb-2">15. Supervisory Authority</h2>
            <p className="text-muted-foreground mb-2">
              If you believe that our processing of your personal data violates the GDPR, you have the right to lodge a complaint with a supervisory authority. The competent supervisory authority in Austria is:
            </p>
            <div className="text-muted-foreground space-y-1 mt-2">
              <p><strong>Österreichische Datenschutzbehörde (Austrian Data Protection Authority)</strong></p>
              <p>Barichgasse 40-42</p>
              <p>1030 Vienna, Austria</p>
              <p><strong>Phone:</strong> +43 1 52 152-0</p>
              <p><strong>Email:</strong> dsb@dsb.gv.at</p>
              <p><strong>Website:</strong> <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">https://www.dsb.gv.at</a></p>
            </div>
          </section>

          <Separator />

          {/* Changes */}
          <section>
            <h2 className="text-lg font-semibold mb-2">16. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground mb-2">
              We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or for other operational reasons. When we make material changes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>We will update the "Last updated" date at the top of this policy</li>
              <li>We will notify you by email or through the Service for significant changes</li>
              <li>We will provide you with the opportunity to review the changes before they take effect</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Your continued use of the Service after changes indicates your acceptance of the updated Privacy Policy.
            </p>
          </section>

          <Separator />

          {/* Contact */}
          <section>
            <h2 className="text-lg font-semibold mb-2">17. Contact Information</h2>
            <p className="text-muted-foreground mb-4">
              For any questions, concerns, or requests regarding this Privacy Policy or our data processing practices, please contact:
            </p>
            <div className="text-muted-foreground space-y-1">
              <p><strong>Sheet Metal Connect e.U.</strong></p>
              <p><strong>Data Protection Contact:</strong> Luke van Enkhuizen</p>
              <p>Dr.-Karl-Lueger-Platz 4B / 16</p>
              <p>1010 Vienna, Austria</p>
              <p><strong>Email:</strong> luke@sheetmetalconnect.com</p>
              <p><strong>Impressum:</strong> <a href="https://vanenkhuizen.com/en/imprint/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">https://vanenkhuizen.com/en/imprint/</a></p>
            </div>
            <p className="text-muted-foreground mt-4">
              We will respond to your inquiries within a reasonable timeframe and in any event within the periods required by applicable law.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
