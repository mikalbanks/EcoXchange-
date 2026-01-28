import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, FileCheck, Users, Lock, AlertTriangle } from "lucide-react";

export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-gradient-dark-green">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Compliance Framework</span>
            </div>
            <h1 className="text-4xl font-bold mb-4" data-testid="text-compliance-title">
              Regulatory Compliance
            </h1>
            <p className="text-lg text-muted-foreground">
              Understanding our approach to SEC-compliant digital securities
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileCheck className="h-6 w-6 text-primary" />
                <CardTitle>Regulation D Framework</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                EcoXchange operates under SEC Regulation D, which provides exemptions from the registration 
                requirements of the Securities Act of 1933 for private placement offerings.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      Rule 506(b)
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Private offerings to an unlimited number of accredited investors and up to 35 
                    non-accredited but sophisticated investors. No general solicitation permitted.
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      Rule 506(c)
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Permits general solicitation and advertising, but all investors must be accredited 
                    and the issuer must take reasonable steps to verify accreditation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                <CardTitle>Investor Verification</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                All investors on EcoXchange must complete our verification process before participating 
                in any offering.
              </p>
              
              <div className="space-y-4 mt-6">
                <div className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-500/10 shrink-0">
                    <span className="text-yellow-500 font-semibold">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">KYC Verification</h4>
                    <p className="text-sm text-muted-foreground">
                      Identity verification through document submission and verification. 
                      In this demo, KYC is a stubbed state machine with manual admin approval.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-500/10 shrink-0">
                    <span className="text-yellow-500 font-semibold">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Accreditation Check</h4>
                    <p className="text-sm text-muted-foreground">
                      Verification of accredited investor status per SEC guidelines. 
                      This includes income, net worth, or professional certification criteria.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 shrink-0">
                    <span className="text-emerald-500 font-semibold">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Investment Eligibility</h4>
                    <p className="text-sm text-muted-foreground">
                      Only investors with approved KYC and verified accreditation status 
                      can submit confirmed investment commitments.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Lock className="h-6 w-6 text-primary" />
                <CardTitle>Transfer Restrictions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Digital securities issued on EcoXchange are subject to transfer restrictions 
                to maintain regulatory compliance.
              </p>
              
              <ul className="space-y-3 mt-4">
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <span className="text-primary">•</span>
                  Securities may only be transferred to other verified accredited investors
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <span className="text-primary">•</span>
                  Holding period requirements per Reg D Rule 144
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <span className="text-primary">•</span>
                  On-chain transfer controls via simulated ERC-3643 compliance module
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <span className="text-primary">•</span>
                  All transfers subject to issuer approval and compliance verification
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <AlertTriangle className="h-6 w-6 text-yellow-500 shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2 text-yellow-500">Demo Disclaimer</h3>
                  <p className="text-sm text-muted-foreground">
                    This is a demonstration platform. No real securities are being offered, sold, or transferred. 
                    No real payments are processed. The stablecoin ledger is entirely simulated for demo purposes. 
                    This platform is not an exchange, ATS, broker-dealer, or custodian. 
                    Consult with legal and financial advisors before making any investment decisions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
