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
      <Link to="/auth">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("legal.termsOfService.backToAbout")}
        </Button>
      </Link>

      <h1 className="text-3xl font-bold mb-2">
        {t("legal.termsOfService.title")}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        {t("legal.termsOfService.lastUpdated")}: 11 January 2026
      </p>

      <Card className="glass-card">
        <CardContent className="p-6 space-y-6">
          {/* Provider Information (ECG Compliance) */}
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Provider Information (Impressum)</h2>
            <div className="text-muted-foreground space-y-1">
              <p><strong>Service Provider:</strong> Sheet Metal Connect e.U.</p>
              <p><strong>Owner:</strong> Luke van Enkhuizen</p>
              <p><strong>Address:</strong> Dr.-Karl-Lueger-Platz 4B / 16, 1010 Vienna, Austria</p>
              <p><strong>UID Number:</strong> ATU74556919</p>
              <p><strong>Commercial Register:</strong> FN 547850m</p>
              <p><strong>Commercial Court:</strong> Handelsgericht Wien, 1030 Wien, Marxergasse 1a</p>
              <p><strong>Regulatory Authority:</strong> Magistratisches Bezirksamt für den 1. Bezirk</p>
              <p><strong>Email:</strong> luke@sheetmetalconnect.com</p>
              <p><strong>Website:</strong> <a href="https://vanenkhuizen.com/en/imprint/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">https://vanenkhuizen.com/en/imprint/</a></p>
            </div>
          </section>

          <Separator />

          {/* Alpha/Trial Notice */}
          <section className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2 text-yellow-500">2. Alpha Trial Notice - Important</h2>
            <p className="text-muted-foreground mb-2">
              <strong>Eryxon Flow is currently provided as an Alpha Trial version.</strong> By using this Service, you acknowledge and accept the following:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Data May Be Deleted:</strong> During the alpha/trial period, all data stored in the Service may be deleted without prior notice at the Provider's discretion, including during system updates, migrations, or discontinuation of the trial.</li>
              <li><strong>No Guarantee of Availability:</strong> The Service may be modified, suspended, or discontinued at any time without liability.</li>
              <li><strong>No Production Use Warranty:</strong> The alpha trial is intended for evaluation and testing purposes. The Provider makes no warranty regarding fitness for production use.</li>
              <li><strong>Export Your Data:</strong> Users are advised to regularly export their data using the provided Data Export feature. The Provider is not responsible for any data loss.</li>
            </ul>
          </section>

          <Separator />

          {/* Acceptance */}
          <section>
            <h2 className="text-lg font-semibold mb-2">3. Acceptance of Terms</h2>
            <p className="text-muted-foreground mb-2">
              By accessing and using Eryxon Flow ("the Service"), you ("the User" or "Customer") enter into a legally binding agreement with Sheet Metal Connect e.U. ("the Provider") and agree to be bound by these Terms of Service ("Terms").
            </p>
            <p className="text-muted-foreground">
              If you are entering into these Terms on behalf of a company or other legal entity, you represent that you have the authority to bind such entity to these Terms. If you do not agree to these Terms, you may not access or use the Service.
            </p>
          </section>

          <Separator />

          {/* Description */}
          <section>
            <h2 className="text-lg font-semibold mb-2">4. Description of Service</h2>
            <p className="text-muted-foreground mb-2">
              Eryxon Flow is a cloud-based Manufacturing Execution System (MES) designed for metals fabrication businesses. The Service provides tools for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Tracking jobs, parts, and operations through manufacturing stages</li>
              <li>Time tracking and operator management on the shop floor</li>
              <li>Quality control and issue tracking</li>
              <li>Production analytics and reporting</li>
              <li>Data export capabilities (CSV, JSON)</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              The Service is hosted by the Provider as a Software-as-a-Service (SaaS) offering.
            </p>
          </section>

          <Separator />

          {/* Software License */}
          <section>
            <h2 className="text-lg font-semibold mb-2">5. Software License</h2>
            <p className="text-muted-foreground mb-2">
              The Eryxon Flow software is licensed under the <strong>Business Source License 1.1 (BSL 1.1)</strong>. Key terms:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Licensor:</strong> Sheet Metal Connect e.U.</li>
              <li><strong>Licensed Work:</strong> Eryxon Flow © 2025 Sheet Metal Connect e.U.</li>
              <li><strong>Permitted Uses:</strong> Self-hosting for internal business operations, development/testing, consulting services to help others with self-hosted instances, creating derivative works for internal use, and forking for your own manufacturing operations.</li>
              <li><strong>Restricted Use:</strong> Offering the Licensed Work as a hosted SaaS competing with the Provider's commercial offering is prohibited without a commercial license.</li>
              <li><strong>Change Date:</strong> Four years from publication</li>
              <li><strong>Change License:</strong> Apache License, Version 2.0</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              The full license text is available at: <a href="https://github.com/SheetMetalConnect/eryxon-flow/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">https://github.com/SheetMetalConnect/eryxon-flow/blob/main/LICENSE</a>
            </p>
          </section>

          <Separator />

          {/* User Accounts */}
          <section>
            <h2 className="text-lg font-semibold mb-2">6. User Accounts and Registration</h2>
            <p className="text-muted-foreground mb-2">
              To use the Service, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Providing accurate, current, and complete registration information</li>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access or security breach</li>
              <li>Ensuring that all users within your organization comply with these Terms</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              The Provider reserves the right to suspend or terminate accounts that violate these Terms or are inactive for an extended period.
            </p>
          </section>

          <Separator />

          {/* Acceptable Use */}
          <section>
            <h2 className="text-lg font-semibold mb-2">7. Acceptable Use Policy</h2>
            <p className="text-muted-foreground mb-2">
              You agree to use the Service only for lawful purposes. You shall NOT:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Use the Service for any illegal activities or in violation of applicable laws</li>
              <li>Attempt to gain unauthorized access to the Service, other users' accounts, or related systems</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Upload malicious code, viruses, or other harmful content</li>
              <li>Violate the privacy, intellectual property, or other rights of third parties</li>
              <li>Reverse engineer, decompile, or disassemble the Service except as permitted by the BSL 1.1 license</li>
              <li>Use the Service to offer a competing SaaS hosting service without a commercial license</li>
              <li>Resell, sublicense, or transfer access to the Service without authorization</li>
              <li>Use automated systems (bots, scrapers) to access the Service without permission</li>
            </ul>
          </section>

          <Separator />

          {/* Data Ownership */}
          <section>
            <h2 className="text-lg font-semibold mb-2">8. Data Ownership and Processing</h2>
            <p className="text-muted-foreground mb-2">
              <strong>Your Data:</strong> You retain all rights to the data you input into the Service ("Customer Data"). This includes manufacturing data, customer information, job records, and any other content you create. The Provider does not claim ownership of your Customer Data.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>License Grant:</strong> You grant the Provider a limited, non-exclusive license to use, store, and process your Customer Data solely for the purpose of providing the Service to you, including technical operations, backups, and support.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Data Processing Agreement:</strong> By using the Service, you agree to the Provider processing personal data contained in your Customer Data as a Data Processor on your behalf, in accordance with Article 28 of the General Data Protection Regulation (GDPR). The Provider processes data only on documented instructions from you.
            </p>
            <p className="text-muted-foreground">
              <strong>Data Portability:</strong> You may export your data at any time using the Data Export feature in CSV or JSON format.
            </p>
          </section>

          <Separator />

          {/* Subscription and Payment */}
          <section>
            <h2 className="text-lg font-semibold mb-2">9. Subscription and Payment</h2>
            <p className="text-muted-foreground mb-2">
              <strong>Alpha Trial:</strong> The current alpha trial is provided free of charge. The Provider reserves the right to introduce paid subscription plans in the future.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Future Paid Plans:</strong> When paid plans are introduced:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Service plans and pricing will be described on the Pricing page</li>
              <li>Fees will be billed in advance on a recurring basis (monthly or annually)</li>
              <li>All prices are exclusive of VAT unless otherwise stated</li>
              <li>You authorize the Provider to charge your payment method</li>
              <li>Refunds are subject to the Provider's refund policy</li>
              <li>Non-payment may result in suspension or termination of access</li>
            </ul>
          </section>

          <Separator />

          {/* Service Availability */}
          <section>
            <h2 className="text-lg font-semibold mb-2">10. Service Availability and Support</h2>
            <p className="text-muted-foreground mb-2">
              The Provider strives to provide reliable service but does not guarantee:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Uninterrupted, timely, secure, or error-free operation</li>
              <li>That the Service will meet all your specific requirements</li>
              <li>That defects will be corrected within a specific timeframe</li>
              <li>Any specific uptime percentage during the alpha trial period</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              The Provider reserves the right to perform maintenance, updates, or modifications to the Service, which may result in temporary unavailability. Reasonable notice will be provided for planned maintenance where practicable.
            </p>
          </section>

          <Separator />

          {/* Termination */}
          <section>
            <h2 className="text-lg font-semibold mb-2">11. Termination</h2>
            <p className="text-muted-foreground mb-2">
              <strong>Termination by User:</strong> You may terminate your account at any time through the Settings page or by contacting the Provider. Upon termination, you should export your data before deletion.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Termination by Provider:</strong> The Provider may suspend or terminate your access:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>If you violate these Terms of Service</li>
              <li>If your account is inactive for an extended period</li>
              <li>If payment is not received (for paid plans)</li>
              <li>If the Provider discontinues the Service</li>
              <li>If required by law or regulatory order</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              <strong>Effect of Termination:</strong> Upon termination, your right to access the Service ceases immediately. Customer Data will be deleted in accordance with the Privacy Policy and GDPR requirements. Users may request data export before termination.
            </p>
          </section>

          <Separator />

          {/* Intellectual Property */}
          <section>
            <h2 className="text-lg font-semibold mb-2">12. Intellectual Property Rights</h2>
            <p className="text-muted-foreground mb-2">
              <strong>Provider's IP:</strong> The Service, including its software, design, logos, trademarks, documentation, and all related materials, is the intellectual property of Sheet Metal Connect e.U. or its licensors. These Terms do not grant you any rights in the Provider's intellectual property except as explicitly stated.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Open Source Components:</strong> The Service may include open-source software components licensed under their respective licenses. A list of open-source components is available upon request.
            </p>
            <p className="text-muted-foreground">
              <strong>Feedback:</strong> If you provide suggestions, ideas, or feedback about the Service, you grant the Provider a perpetual, irrevocable, royalty-free license to use such feedback for any purpose.
            </p>
          </section>

          <Separator />

          {/* Warranty Disclaimer */}
          <section>
            <h2 className="text-lg font-semibold mb-2">13. Warranty Disclaimer</h2>
            <p className="text-muted-foreground mb-2">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY</li>
              <li>THE PROVIDER DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND TITLE</li>
              <li>THE PROVIDER DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE</li>
              <li>THE PROVIDER DOES NOT WARRANT THAT THE SERVICE WILL MEET YOUR SPECIFIC REQUIREMENTS OR EXPECTATIONS</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              This disclaimer does not affect any statutory rights that cannot be excluded or limited under applicable law, including consumer protection rights under Austrian law (Konsumentenschutzgesetz - KSchG).
            </p>
          </section>

          <Separator />

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-lg font-semibold mb-2">14. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-2">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>THE PROVIDER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
              <li>THE PROVIDER SHALL NOT BE LIABLE FOR LOSS OF DATA, PROFITS, REVENUE, BUSINESS OPPORTUNITIES, OR BUSINESS INTERRUPTION</li>
              <li>THE PROVIDER'S TOTAL AGGREGATE LIABILITY SHALL NOT EXCEED THE AMOUNTS PAID BY YOU TO THE PROVIDER IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR €100, WHICHEVER IS GREATER</li>
              <li>DURING THE FREE ALPHA TRIAL PERIOD, THE PROVIDER'S LIABILITY IS LIMITED TO €100</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              These limitations do not exclude liability for: (a) death or personal injury caused by negligence; (b) fraud or fraudulent misrepresentation; (c) any liability that cannot be excluded under Austrian law; or (d) gross negligence or willful misconduct.
            </p>
          </section>

          <Separator />

          {/* Indemnification */}
          <section>
            <h2 className="text-lg font-semibold mb-2">15. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify, defend, and hold harmless the Provider, its officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights; or (d) your Customer Data. This indemnification obligation shall survive termination of these Terms.
            </p>
          </section>

          <Separator />

          {/* Governing Law */}
          <section>
            <h2 className="text-lg font-semibold mb-2">16. Governing Law and Jurisdiction</h2>
            <p className="text-muted-foreground mb-2">
              <strong>Governing Law:</strong> These Terms shall be governed by and construed in accordance with the laws of the Republic of Austria, without regard to its conflict of law provisions.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Jurisdiction:</strong> Any disputes arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the competent courts in Vienna, Austria.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Consumer Rights:</strong> If you are a consumer within the meaning of the Austrian Consumer Protection Act (Konsumentenschutzgesetz - KSchG), mandatory consumer protection provisions of your country of residence may apply to the extent they provide greater protection. Consumers may also bring claims in the courts of their country of residence.
            </p>
            <p className="text-muted-foreground">
              <strong>EU Online Dispute Resolution:</strong> The European Commission provides an online dispute resolution platform at: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">https://ec.europa.eu/consumers/odr</a>
            </p>
          </section>

          <Separator />

          {/* Miscellaneous */}
          <section>
            <h2 className="text-lg font-semibold mb-2">17. Miscellaneous Provisions</h2>
            <p className="text-muted-foreground mb-2">
              <strong>Entire Agreement:</strong> These Terms, together with the Privacy Policy, constitute the entire agreement between you and the Provider regarding the Service.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full force and effect.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>No Waiver:</strong> The Provider's failure to enforce any right or provision shall not constitute a waiver of such right or provision.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Assignment:</strong> You may not assign or transfer these Terms without the Provider's prior written consent. The Provider may assign these Terms to any affiliate or successor in connection with a merger, acquisition, or sale of assets.
            </p>
            <p className="text-muted-foreground">
              <strong>Language:</strong> These Terms are provided in English. In case of any discrepancy with translations, the English version shall prevail.
            </p>
          </section>

          <Separator />

          {/* Changes */}
          <section>
            <h2 className="text-lg font-semibold mb-2">18. Changes to Terms</h2>
            <p className="text-muted-foreground mb-2">
              The Provider reserves the right to modify these Terms at any time. Material changes will be communicated to you by:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Email notification to the address associated with your account</li>
              <li>Prominent notice within the Service</li>
              <li>Updating the "Last updated" date at the top of these Terms</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Your continued use of the Service after such changes constitutes acceptance of the modified Terms. If you do not agree to the modified Terms, you must stop using the Service and terminate your account.
            </p>
          </section>

          <Separator />

          {/* Contact */}
          <section>
            <h2 className="text-lg font-semibold mb-2">19. Contact Information</h2>
            <p className="text-muted-foreground mb-4">
              For questions, concerns, or requests regarding these Terms of Service, please contact:
            </p>
            <div className="text-muted-foreground space-y-1">
              <p><strong>Sheet Metal Connect e.U.</strong></p>
              <p>Dr.-Karl-Lueger-Platz 4B / 16</p>
              <p>1010 Vienna, Austria</p>
              <p><strong>Email:</strong> luke@sheetmetalconnect.com</p>
              <p><strong>Impressum:</strong> <a href="https://vanenkhuizen.com/en/imprint/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">https://vanenkhuizen.com/en/imprint/</a></p>
              <p><strong>GitHub:</strong> <a href="https://github.com/SheetMetalConnect/eryxon-flow/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Report an issue</a></p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
