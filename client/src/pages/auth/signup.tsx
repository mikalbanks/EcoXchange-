import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, Wallet, Shield, Info } from "lucide-react";
import { signupSchema } from "@shared/schema";

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { signup } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAccredited, setIsAccredited] = useState<boolean | null>(null);
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const roleFromUrl = searchParams.get("role");

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      role: (roleFromUrl === "developer" ? "DEVELOPER" : "INVESTOR") as "INVESTOR" | "DEVELOPER",
    },
  });

  const selectedRole = form.watch("role");

  useEffect(() => {
    if (roleFromUrl === "developer") {
      form.setValue("role", "DEVELOPER");
    } else if (roleFromUrl === "investor") {
      form.setValue("role", "INVESTOR");
    }
  }, [roleFromUrl, form]);

  async function onSubmit(values: SignupFormValues) {
    setIsLoading(true);
    try {
      await signup(values.email, values.password, values.role);
      toast({
        title: "Account created!",
        description: "Welcome to EcoXchange.",
      });
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-dark-green">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <img 
              src="/brand/ecoxchange-logo.png" 
              alt="EcoXchange" 
              className="h-14 w-auto mx-auto mb-4"
              data-testid="img-signup-logo"
            />
            <h1 className="text-2xl font-bold" data-testid="text-signup-title">Create your account</h1>
            <p className="text-muted-foreground mt-2">
              Join the digital securities marketplace for renewable energy
            </p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Sign Up</CardTitle>
              <CardDescription>
                Choose your account type and enter your details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(v) => {
                              field.onChange(v);
                              setIsAccredited(null);
                            }}
                            value={field.value}
                            className="grid grid-cols-2 gap-4"
                          >
                            <label
                              htmlFor="investor"
                              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                field.value === "INVESTOR"
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <RadioGroupItem value="INVESTOR" id="investor" className="sr-only" />
                              <Wallet className="h-6 w-6 text-primary" />
                              <span className="font-medium text-sm">Investor</span>
                              <span className="text-xs text-muted-foreground text-center">
                                Invest in digital securities
                              </span>
                            </label>
                            
                            <label
                              htmlFor="developer"
                              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                field.value === "DEVELOPER"
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <RadioGroupItem value="DEVELOPER" id="developer" className="sr-only" />
                              <Building2 className="h-6 w-6 text-primary" />
                              <span className="font-medium text-sm">Issuer</span>
                              <span className="text-xs text-muted-foreground text-center">
                                Tokenize projects
                              </span>
                            </label>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedRole === "INVESTOR" && (
                    <div className="space-y-3">
                      <FormLabel>Accreditation Status</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setIsAccredited(true)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isAccredited === true
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                          data-testid="button-accredited-yes"
                        >
                          <Shield className="h-5 w-5 text-primary" />
                          <span className="text-sm font-medium">Accredited</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAccredited(false)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isAccredited === false
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                          data-testid="button-accredited-no"
                        >
                          <Info className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium">Non-Accredited</span>
                        </button>
                      </div>
                      {isAccredited === false && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border" data-testid="text-non-accredited-notice">
                          <p className="text-sm text-muted-foreground">
                            EcoXchange currently serves accredited investors under Reg D. Non-accredited investor access is planned for Phase 2/3 under Reg CF and Reg A+ frameworks. You can still create an account to stay informed about upcoming opportunities.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            data-testid="input-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || (selectedRole === "INVESTOR" && isAccredited === null)}
                    data-testid="button-submit-signup"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    All participants must complete KYC/AML verification after registration. Offerings comply with applicable securities exemptions.
                  </p>
                </form>
              </Form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-primary hover:underline" data-testid="link-login">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
