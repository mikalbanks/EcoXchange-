import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { loginSchema } from "@shared/schema";

type LoginFormValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  {
    label: "Admin",
    email: "admin@ecoxchange.demo",
    password: "Admin123!",
    lands: "Platform oversight console",
  },
  {
    label: "Developer",
    email: "developer@ecoxchange.demo",
    password: "Developer123!",
    lands: "Project pipeline dashboard",
  },
  {
    label: "Investor",
    email: "investor@ecoxchange.demo",
    password: "Investor123!",
    lands: "Marketplace and commitments",
  },
] as const;

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      await login(values.email, values.password);
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // One click to sign in as a given role — the three demo rows used to be
  // read-only text you had to retype.
  async function signInAsDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    form.setValue("email", account.email, { shouldValidate: true });
    form.setValue("password", account.password, { shouldValidate: true });
    await onSubmit({ email: account.email, password: account.password });
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
              data-testid="img-login-logo"
            />
            <h1 className="text-2xl font-bold" data-testid="text-login-title">Sign in to EcoXchange</h1>
            <p className="text-muted-foreground mt-2">
              Access the digital securities platform
            </p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Sign In</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    disabled={isLoading}
                    data-testid="button-submit-login"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/auth/signup" className="text-primary hover:underline" data-testid="link-signup">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 border-muted/50 bg-muted/10">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground text-center mb-3">
                Demo accounts — click one to sign in
              </p>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => signInAsDemo(account)}
                    disabled={isLoading}
                    className="w-full text-left rounded-md border border-border/60 bg-card/60 px-3 py-2 transition-colors hover:border-primary/60 hover:bg-card disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid={`button-demo-${account.label.toLowerCase()}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{account.label}</span>
                      <span className="font-mono text-xs text-muted-foreground truncate">
                        {account.email}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{account.lands}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
