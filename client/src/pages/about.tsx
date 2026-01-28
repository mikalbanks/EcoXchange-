import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Leaf, Target, Users, Shield, Globe } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-dark-green">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Leaf className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">About EcoXchange</span>
            </div>
            <h1 className="text-4xl font-bold mb-4" data-testid="text-about-title">
              Powering the Clean Energy Transition
            </h1>
            <p className="text-lg text-muted-foreground">
              We're building the infrastructure for institutional capital to flow into renewable energy projects.
            </p>
          </div>

          <div className="prose prose-invert max-w-none mb-16">
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
                <p className="text-muted-foreground mb-6">
                  EcoXchange is a demonstration platform for compliant renewable infrastructure digital securities issuance. 
                  We aim to bridge the gap between institutional investors seeking sustainable returns and developers 
                  building the clean energy infrastructure of tomorrow.
                </p>
                <p className="text-muted-foreground">
                  By leveraging digital securities technology, we provide transparent, efficient, and compliant 
                  access to solar, wind, and hydrogen projects with stable, long-term cash flows backed by 
                  power purchase agreements (PPAs).
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">For Issuers</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Renewable energy developers and sponsors can structure Reg D compliant offerings, 
                  reach accredited investors, and streamline capital raising with digital securities infrastructure.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">For Investors</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Accredited investors gain access to institutional-quality renewable infrastructure assets 
                  with transparent reporting, digital ownership records, and automated quarterly distributions.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-16">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold mb-6">Key Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    icon: Shield,
                    title: "Regulatory Compliance",
                    desc: "SEC Reg D framework with full KYC/AML verification and accreditation checks"
                  },
                  {
                    icon: Globe,
                    title: "Digital Securities",
                    desc: "Simulated ERC-3643 tokenization for compliant on-chain ownership records"
                  },
                  {
                    icon: Target,
                    title: "Transparent Reporting",
                    desc: "Real-time portfolio tracking, distributions, and project performance"
                  },
                  {
                    icon: Leaf,
                    title: "Sustainable Impact",
                    desc: "Direct investment in solar, wind, and hydrogen infrastructure projects"
                  }
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
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                This is a demonstration MVP for educational purposes.
              </p>
              <p className="text-sm text-muted-foreground">
                No real securities are offered. No real payments are processed. 
                Stablecoin functionality is simulated for demo purposes only.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
