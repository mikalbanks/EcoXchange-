import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { offeringFormSchema, type Project } from "@shared/schema";

type OfferingFormValues = z.infer<typeof offeringFormSchema>;

export default function NewOffering() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const projectIdFromUrl = searchParams.get("projectId");
  const { toast } = useToast();

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/issuer/projects"],
  });

  const form = useForm<OfferingFormValues>({
    resolver: zodResolver(offeringFormSchema),
    defaultValues: {
      name: "",
      projectId: projectIdFromUrl || "",
      targetRaise: "",
      minInvestment: "",
      securityType: "EQUITY",
      distributionFrequency: "QUARTERLY",
      expectedIrr: "",
      openDate: "",
      closeDate: "",
      jurisdiction: "US",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: OfferingFormValues) => {
      const res = await apiRequest("POST", "/api/issuer/offerings", values);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/issuer/offerings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/issuer/stats"] });
      toast({
        title: "Offering created",
        description: "Your offering has been created as a draft.",
      });
      setLocation(`/issuer/offerings/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create offering",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: OfferingFormValues) {
    createMutation.mutate(values);
  }

  return (
    <DashboardLayout
      title="Create New Offering"
      description="Structure a new securities offering"
      breadcrumbs={[
        { label: "Issuer", href: "/issuer" },
        { label: "Offerings", href: "/issuer/offerings" },
        { label: "New Offering" }
      ]}
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Offering Details</CardTitle>
            <CardDescription>
              Configure your Reg D securities offering
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project">
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects?.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offering Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Solar Alpha Series A"
                          data-testid="input-offering-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetRaise"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Raise ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 5000000"
                            data-testid="input-target-raise"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minInvestment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Investment ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 25000"
                            data-testid="input-min-investment"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="securityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-security-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EQUITY">Equity</SelectItem>
                            <SelectItem value="PREFERRED">Preferred</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="distributionFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distribution Frequency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-distribution-frequency">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                            <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                            <SelectItem value="ANNUALLY">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="expectedIrr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected IRR (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="e.g., 8.5"
                          data-testid="input-expected-irr"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Target internal rate of return for investors
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="openDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Open Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            data-testid="input-open-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="closeDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Close Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            data-testid="input-close-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/issuer/offerings")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-create-offering"
                  >
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create as Draft
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
