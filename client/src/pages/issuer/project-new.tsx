import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { projectFormSchema } from "@shared/schema";

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function NewProject() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      assetType: "SOLAR",
      location: "",
      capacityMW: "",
      ppaCounterparty: "",
      ppaTenorYears: undefined,
      ppaPrice: "",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      const res = await apiRequest("POST", "/api/issuer/projects", values);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/issuer/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/issuer/stats"] });
      toast({
        title: "Project created",
        description: "Your project has been created successfully.",
      });
      setLocation(`/issuer/projects/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: ProjectFormValues) {
    createMutation.mutate(values);
  }

  return (
    <DashboardLayout
      title="Create New Project"
      description="Add a new renewable energy project"
      breadcrumbs={[
        { label: "Issuer", href: "/issuer" },
        { label: "Projects", href: "/issuer/projects" },
        { label: "New Project" }
      ]}
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Enter the details of your renewable energy project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Solar Farm Alpha"
                          data-testid="input-project-name"
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
                    name="assetType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-asset-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="SOLAR">Solar</SelectItem>
                            <SelectItem value="WIND">Wind</SelectItem>
                            <SelectItem value="HYDROGEN">Hydrogen</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Texas, USA"
                            data-testid="input-location"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="capacityMW"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (MW)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="e.g., 50"
                          data-testid="input-capacity"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The installed capacity in megawatts
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="ppaCounterparty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PPA Counterparty</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Utility Co."
                            data-testid="input-ppa-counterparty"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ppaTenorYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PPA Tenor (Years)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 20"
                            data-testid="input-ppa-tenor"
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ppaPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PPA Price ($/MWh)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 35.00"
                            data-testid="input-ppa-price"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your project..."
                          className="min-h-[100px]"
                          data-testid="input-description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/issuer/projects")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-create-project"
                  >
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Project
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
