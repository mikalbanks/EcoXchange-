import { Link } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sun, 
  Wind, 
  Zap, 
  Shield, 
  TrendingUp, 
  Users, 
  ArrowRight,
  Building2,
  Wallet
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-dark-green">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(115,172,32,0.15),transparent_50%)]" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <img src="/brand/ecoxchange-logo.png" alt="" className="h-4 w-auto" data-testid="img-hero-badge-logo" />
              <span className="text-sm font-medium text-primary">Compliant Digital Securities</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
              Invest in the Future of
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mt-2">
                Clean Energy Infrastructure
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              EcoXchange is a compliant platform for renewable infrastructure digital securities. 
              Connect with institutional-grade solar, wind, and hydrogen projects.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup?role=investor">
                <Button size="lg" className="min-w-[180px] gap-2" data-testid="button-cta-investor">
                  <Wallet className="h-5 w-5" />
                  For Investors
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/signup?role=issuer">
                <Button size="lg" variant="outline" className="min-w-[180px] gap-2" data-testid="button-cta-issuer">
                  <Building2 className="h-5 w-5" />
                  For Issuers
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Asset Types */}
      <section className="py-20 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Asset Classes</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Diversified exposure to renewable energy infrastructure across multiple technologies
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="group hover-elevate relative overflow-visible">
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 mx-auto mb-4 group-hover:glow-lime transition-all">
                  <Sun className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Solar</h3>
                <p className="text-sm text-muted-foreground">
                  Utility-scale and distributed solar with long-term PPAs
                </p>
              </CardContent>
            </Card>
            
            <Card className="group hover-elevate relative overflow-visible">
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4 group-hover:glow-lime transition-all">
                  <Wind className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Wind</h3>
                <p className="text-sm text-muted-foreground">
                  Onshore and offshore wind farms with stable cash flows
                </p>
              </CardContent>
            </Card>
            
            <Card className="group hover-elevate relative overflow-visible">
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-secondary/20 mx-auto mb-4 group-hover:glow-lime transition-all">
                  <Zap className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Hydrogen</h3>
                <p className="text-sm text-muted-foreground">
                  Green hydrogen production facilities and infrastructure
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Institutional-Grade Platform
              </h2>
              <p className="text-muted-foreground mb-8">
                EcoXchange provides a compliant framework for digital securities issuance, 
                designed for accredited investors and institutional issuers.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: Shield, title: "Reg D Compliant", desc: "SEC-compliant private placement framework" },
                  { icon: Users, title: "KYC/AML Verified", desc: "Full investor verification and accreditation" },
                  { icon: TrendingUp, title: "Transparent Reporting", desc: "Real-time portfolio tracking and distributions" },
                ].map((feature) => (
                  <div key={feature.title} className="flex gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl blur-3xl" />
              <Card className="relative">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <img 
                      src="/brand/ecoxchange-logo.png" 
                      alt="EcoXchange" 
                      className="h-10 w-auto"
                    />
                    <div>
                      <p className="font-semibold">Sample Offering</p>
                      <p className="text-sm text-muted-foreground">Solar Project Alpha</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Target Raise</span>
                      <span className="font-medium">$5,000,000</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Min Investment</span>
                      <span className="font-medium">$25,000</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Expected IRR</span>
                      <span className="font-medium text-primary">8.5%</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Distribution</span>
                      <span className="font-medium">Quarterly</span>
                    </div>
                  </div>
                  
                  <Button className="w-full mt-6" disabled>
                    View Details
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A streamlined process for both issuers and investors
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">For Issuers</h3>
                </div>
                <ol className="space-y-4">
                  {[
                    "Register and complete issuer verification",
                    "Create project profile with asset details",
                    "Structure offering with Reg D parameters",
                    "Receive commitments from verified investors",
                    "Issue digital securities upon closing",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Wallet className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">For Investors</h3>
                </div>
                <ol className="space-y-4">
                  {[
                    "Register and complete KYC verification",
                    "Verify accredited investor status",
                    "Browse marketplace for open offerings",
                    "Submit investment commitment",
                    "Receive tokens and quarterly distributions",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join the platform connecting renewable energy infrastructure with accredited investors.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="min-w-[180px]" data-testid="button-cta-signup">
                  Create Account
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="min-w-[180px]">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/brand/ecoxchange-logo.png" 
                alt="EcoXchange" 
                className="h-8 w-auto"
                data-testid="img-footer-logo"
              />
              <span className="text-sm text-muted-foreground">Clean Energy Market</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-foreground transition-colors" data-testid="link-footer-about">About</Link>
              <Link href="/compliance" className="hover:text-foreground transition-colors" data-testid="link-footer-compliance">Compliance</Link>
              <span>© 2024 EcoXchange Demo</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
