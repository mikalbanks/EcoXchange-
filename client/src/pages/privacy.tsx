import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Shield, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-privacy">
      <Header />

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-home">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Privacy Policy</h1>
          </div>
          <p className="text-muted-foreground" data-testid="text-effective-date">Effective Date: March 6, 2026</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Introduction</CardTitle>
            </CardHeader>
            <CardContent className="max-w-none space-y-4 text-muted-foreground">
              <p>
                EcoXchange, Inc. ("EcoXchange," "we," "us," or "our") is committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you access or use our digital securities platform, website, and related services (collectively, the "Platform").
              </p>
              <p>
                Our Platform facilitates the issuance, management, and investment in digital securities backed by renewable energy project assets. Given the regulated nature of our services, we are required to collect certain personal and financial information to comply with applicable securities laws, anti-money laundering (AML) regulations, and know-your-customer (KYC) requirements.
              </p>
              <p>
                By accessing or using the Platform, you agree to the terms of this Privacy Policy. If you do not agree, please do not use the Platform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>1. Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="max-w-none space-y-4 text-muted-foreground">
              <p className="font-semibold text-foreground">A. Information You Provide</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><span className="text-foreground">Account Registration:</span> Name, email address, organization name, and password when you create an account.</li>
                <li><span className="text-foreground">Identity Verification (KYC/AML):</span> Government-issued identification documents, date of birth, Social Security number or tax identification number, residential address, and other identity verification data collected through our identity verification partner, Persona.</li>
                <li><span className="text-foreground">Accredited Investor Verification:</span> Financial statements, tax returns, income documentation, net worth information, or professional certifications as required under SEC Regulation D 506(c).</li>
                <li><span className="text-foreground">Investment Information:</span> Investment commitments, preferences, transaction history, and related financial data.</li>
                <li><span className="text-foreground">Issuer Information:</span> Project details, corporate documents, financial models, power purchase agreements, and other materials submitted through the issuer portal.</li>
                <li><span className="text-foreground">Communications:</span> Messages, inquiries, and correspondence sent through the Platform.</li>
              </ul>

              <p className="font-semibold text-foreground">B. Information Collected Automatically</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><span className="text-foreground">Device and Usage Data:</span> IP address, browser type, operating system, referring URLs, pages visited, time spent on pages, and clickstream data.</li>
                <li><span className="text-foreground">Cookies and Tracking Technologies:</span> Session cookies to maintain authentication state, and analytics cookies to understand Platform usage. See Section 7 for details.</li>
                <li><span className="text-foreground">Log Data:</span> Server logs recording API requests, authentication events, and platform activity for security and compliance purposes.</li>
              </ul>

              <p className="font-semibold text-foreground">C. Information from Third Parties</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><span className="text-foreground">Identity Verification Services:</span> Verification results, risk scores, and watchlist screening data from Persona and related compliance services.</li>
                <li><span className="text-foreground">Broker-Dealer Partners:</span> Transaction confirmations and regulatory filings from our broker-dealer partners.</li>
                <li><span className="text-foreground">Public Data:</span> Publicly available information used to verify identities or assess investment suitability.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="max-w-none space-y-4 text-muted-foreground">
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, operate, and maintain the Platform and our digital securities services.</li>
                <li>Verify your identity and accredited investor status as required by federal securities law.</li>
                <li>Process investment commitments and manage security token issuance.</li>
                <li>Comply with AML, KYC, and other regulatory obligations under the Securities Act of 1933, the Securities Exchange Act of 1934, and applicable state laws.</li>
                <li>Calculate and distribute yield payments to investors based on energy production data.</li>
                <li>Communicate with you regarding your account, investments, distributions, and platform updates.</li>
                <li>Detect, prevent, and respond to fraud, unauthorized access, or other security incidents.</li>
                <li>Improve the Platform through analytics and user feedback.</li>
                <li>Maintain records as required by securities regulations and our broker-dealer obligations.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. How We Share Your Information</CardTitle>
            </CardHeader>
            <CardContent className="max-w-none space-y-4 text-muted-foreground">
              <p>We do not sell your personal information. We may share your information with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><span className="text-foreground">Regulatory Bodies:</span> The SEC, FINRA, FinCEN, state securities regulators, and other government authorities as required by law.</li>
                <li><span className="text-foreground">Identity Verification Partners:</span> Persona, for KYC/AML screening and identity verification processing.</li>
                <li><span className="text-foreground">Broker-Dealer Partners:</span> Registered broker-dealers involved in the offering and sale of securities on the Platform.</li>
                <li><span className="text-foreground">Transfer Agents:</span> For maintaining security ownership records and processing transfers.</li>
                <li><span className="text-foreground">Qualified Custodians:</span> For the safekeeping of digital securities and related assets.</li>
                <li><span className="text-foreground">Service Providers:</span> Hosting, analytics, email, and other operational service providers who process data on our behalf under contractual obligations.</li>
                <li><span className="text-foreground">Legal and Compliance:</span> When required by law, subpoena, court order, or to protect the rights, safety, or property of EcoXchange, our users, or others.</li>
                <li><span className="text-foreground">Business Transfers:</span> In connection with a merger, acquisition, reorganization, or sale of assets, your information may be transferred as part of that transaction.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Data Security</CardTitle>
            </CardHeader>
            <CardContent className="max-w-none space-y-4 text-muted-foreground">
              <p>
                We implement industry-standard security measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Encryption of sensitive data in transit (TLS/SSL) and at rest.</li>
                <li>Bcrypt password hashing with computational cost factor of 12 rounds.</li>
                <li>Rate limiting on authentication endpoints to prevent brute-force attacks.</li>
                <li>Session-based authentication with secure, HTTP-only cookies.</li>
                <li>Role-based access controls limiting data access to authorized personnel.</li>
                <li>Regular security assessments and monitoring.</li>
              </ul>
              <p>
                While we strive to protect your information, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security, but we are committed to promptly addressing any security incidents.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="max-w-none space-y-4 text-muted-foreground">
              <p>
                Due to the regulated nature of digital securities, we retain certain information for extended periods as required by applicable law:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><span className="text-foreground">Securities Transaction Records:</span> Retained for a minimum of 6 years following the transaction, as required under SEC and FINRA rules.</li>
                <li><span className="text-foreground">KYC/AML Records:</span> Retained for a minimum of 5 years after the account is closed, as required under the Bank Secrecy Act and FinCEN regulations.</li>
                <li><span className="text-foreground">Account Information:</span> Retained for the duration of your account and for a reasonable period thereafter for legal and compliance purposes.</li>
                <li><span className="text-foreground">Server Logs:</span> Retained for up to 2 years for security and compliance monitoring.</li>
              </ul>
              <p>
                When retention periods expire and no legal obligation requires continued storage, we will securely delete or anonymize the data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Your Rights</CardTitle>
            </CardHeader>
            <CardContent className="max-w-none space-y-4 text-muted-foreground">
              <p className="font-semibold text-foreground">A. All Users</p>
              <p>Depending on your jurisdiction, you may have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access the personal information we hold about you.</li>
                <li>Request correction of inaccurate or incomplete information.</li>
                <li>Request deletion of your personal information, subject to legal retention requirements.</li>
                <li>Withdraw consent for optional data processing activities.</li>
                <li>Receive a copy of your data in a portable format.</li>
              </ul>

              <p className="font-semibold text-foreground">B. California Residents (CCPA/CPRA)</p>
              <p>If you are a California resident, you have the following additional rights under the California Consumer Privacy Act (as amended by the California Privacy Rights Act):</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><span className="text-foreground">Right to Know:</span> You may request that we disclose the categories and specific pieces of personal information we have collected about you, the sources of collection, the business purposes for collection, and the categories of third parties with whom we share information.</li>
                <li><span className="text-foreground">Right to Delete:</span> You may request deletion of your personal information, subject to certain exceptions (including legal and regulatory retention obligations).</li>
                <li><span className="text-foreground">Right to Correct:</span> You may request that we correct inaccurate personal information.</li>
                <li><span className="text-foreground">Right to Opt-Out of Sale/Sharing:</span> We do not sell your personal information. We do not share personal information for cross-context behavioral advertising.</li>
                <li><span className="text-foreground">Right to Non-Discrimination:</span> We will not discriminate against you for exercising your privacy rights.</li>
              </ul>
              <p>
                To exercise these rights, contact us at privacy@ecoxchange.com. We will verify your identity before processing your request.
              </p>

              <p className="font-semibold text-foreground">C. Limitations</p>
              <p>
                Please note that certain data rights may be limited where we are required to retain information under securities regulations, AML laws, or other legal obligations. We will inform you of any such limitations when you submit a request.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Cookies and Tracking Technologies</CardTitle>
            </CardHeader>
            <CardContent className="max-w-none space-y-4 text-muted-foreground">
              <p>We use the following types of cookies:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><span className="text-foreground">Essential Cookies:</span> Required for Platform functionality, including session management and authentication. These cannot be disabled.</li>
                <li><span className="text-foreground">Analytics Cookies:</span> Help us understand how users interact with the Platform so we can improve the experience. These are optional.</li>
              </ul>
              <p>
                You can manage cookie preferences through your browser settings. Disabling essential cookies may prevent you from using certain Platform features.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Third-Party Links</CardTitle>
            </CardHeader>
            <CardContent className="max-w-none space-y-4 text-muted-foreground">
              <p>
                The Platform may contain links to third-party websites, services, or applications (including identity verification and financial service providers). We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing your information.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent className="max-w-none space-y-4 text-muted-foreground">
              <p>
                The Platform is not intended for individuals under the age of 18. We do not knowingly collect personal information from minors. If you are a parent or guardian and believe we have collected information from a child, please contact us immediately at privacy@ecoxchange.com and we will take steps to delete such information.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Changes to This Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="max-w-none space-y-4 text-muted-foreground">
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or Platform features. When we make material changes, we will notify you by updating the "Effective Date" at the top of this policy and, where appropriate, by providing notice through the Platform or via email.
              </p>
              <p>
                Your continued use of the Platform after the effective date of any changes constitutes your acceptance of the updated Privacy Policy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="max-w-none space-y-4 text-muted-foreground">
              <p>
                If you have questions about this Privacy Policy, wish to exercise your privacy rights, or have concerns about how your information is handled, please contact us:
              </p>
              <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                <p className="text-foreground font-semibold">EcoXchange, Inc.</p>
                <p>Email: privacy@ecoxchange.com</p>
                <p>Subject Line: Privacy Inquiry</p>
              </div>
              <p>
                We will respond to verified requests within 45 days, as required by applicable law.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border/40 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 EcoXchange, Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
