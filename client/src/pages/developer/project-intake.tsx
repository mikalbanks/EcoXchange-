import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, HelpCircle, Rocket, Sparkles } from "lucide-react";
import { LocationPicker } from "@/components/developer/location-picker";
import {
  suggestedTilt,
  timezoneFromLongitude,
} from "@/hooks/use-intake-form";
import { DEMO_DEVELOPER_PROJECT } from "@/lib/demo-projects";
import { setPendingBacktest } from "@/lib/pending-backtest";
import {
  developerIntakeSchema,
  type DeveloperIntakeData,
  INVERTER_BRANDS,
  MODULE_EFFICIENCY_DEFAULTS,
  MODULE_TYPES,
  OFFTAKE_TYPES,
  RACKING_TYPES,
  DEFAULT_DEGRADATION_RATE,
  DEFAULT_SYSTEM_LOSSES,
} from "@shared/developer-backtest";
import { cn } from "@/lib/utils";

const STEPS = [
  { number: 1, label: "Location" },
  { number: 2, label: "System Specs" },
  { number: 3, label: "Inverter" },
  { number: 4, label: "Off-take" },
  { number: 5, label: "Review" },
];

const STEP_FIELDS: Record<number, (keyof DeveloperIntakeData)[]> = {
  1: ["name", "latitude", "longitude", "timezone"],
  2: [
    "capacity_kw_dc",
    "tilt_deg",
    "azimuth_deg",
    "module_type",
    "module_efficiency",
    "racking_type",
    "dc_ac_ratio",
    "commissioning_date",
  ],
  3: ["inverter_brand", "has_monitoring_access", "inverter_plant_id"],
  4: ["offtake_type", "ppa_rate_per_kwh", "ppa_escalator"],
};

const LABELS: Record<string, string> = {
  monocrystalline: "Monocrystalline",
  polycrystalline: "Polycrystalline",
  thin_film: "Thin Film",
  cdte: "CdTe",
  open_rack: "Open Rack",
  roof_mount: "Roof Mount",
  single_axis_tracker: "Single-Axis Tracker",
  solaredge: "SolarEdge",
  enphase: "Enphase",
  fronius: "Fronius",
  sma: "SMA",
  ppa: "PPA",
  community_solar: "Community Solar",
  net_metering: "Net Metering",
  merchant: "Merchant",
};

function FieldTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="ml-1 inline h-3.5 w-3.5 cursor-help text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function ProjectIntake() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<DeveloperIntakeData>({
    resolver: zodResolver(developerIntakeSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      latitude: undefined as unknown as number,
      longitude: undefined as unknown as number,
      timezone: "",
      capacity_kw_dc: undefined as unknown as number,
      tilt_deg: undefined as unknown as number,
      azimuth_deg: 180,
      module_type: "monocrystalline",
      module_efficiency: 0.2,
      racking_type: "open_rack",
      dc_ac_ratio: 1.2,
      commissioning_date: "",
      inverter_brand: "solaredge",
      has_monitoring_access: false,
      inverter_plant_id: "",
      developer_notes: "",
      offtake_type: "ppa",
      ppa_rate_per_kwh: undefined,
      ppa_escalator: 2,
      utility_provider: "",
      equity_raise_requested: undefined,
      system_losses: DEFAULT_SYSTEM_LOSSES,
      degradation_rate: DEFAULT_DEGRADATION_RATE,
    },
  });

  const watchMonitoring = form.watch("has_monitoring_access");
  const watchOfftake = form.watch("offtake_type");

  const loadDemo = () => {
    form.reset(DEMO_DEVELOPER_PROJECT);
  };

  const handleNext = async () => {
    const fields = STEP_FIELDS[currentStep];
    if (fields) {
      const valid = await form.trigger(fields as any);
      if (!valid) return;
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length));
  };

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const onRun = form.handleSubmit((values) => {
    setPendingBacktest({ project: values, backtest_months: 12 });
    setLocation("/developer/backtest/new");
  });

  return (
    <DashboardLayout
      title="Onboard a Project"
      description="Enter your project specs and run a 12-month production backtest"
      breadcrumbs={[{ label: "Developer", href: "/developer" }, { label: "Onboard" }]}
      actions={
        <Button variant="outline" className="gap-2" onClick={loadDemo} data-testid="button-load-demo">
          <Sparkles className="h-4 w-4" />
          Load Savannah demo
        </Button>
      }
    >
      {/* Step indicator */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          {STEPS.map((step, idx) => (
            <div key={step.number} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium",
                    currentStep > step.number
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep === step.number
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground",
                  )}
                  data-testid={`step-indicator-${step.number}`}
                >
                  {currentStep > step.number ? <Check className="h-4 w-4" /> : step.number}
                </div>
                <span className="mt-1 hidden text-xs text-muted-foreground sm:block">
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1",
                    currentStep > step.number ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <Progress value={(currentStep / STEPS.length) * 100} />
      </div>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          {/* Step 1 — Location */}
          {currentStep === 1 && (
            <Card data-testid="step-location">
              <CardHeader>
                <CardTitle>Project Location</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project name</FormLabel>
                        <FormControl>
                          <Input placeholder="Savannah Community Solar" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.0001"
                              placeholder="32.08"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.valueAsNumber)}
                              onBlur={(e) => {
                                field.onBlur();
                                const lat = e.target.valueAsNumber;
                                if (Number.isFinite(lat) && !form.getValues("tilt_deg")) {
                                  form.setValue("tilt_deg", suggestedTilt(lat));
                                }
                              }}
                              data-testid="input-latitude"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.0001"
                              placeholder="-81.09"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.valueAsNumber)}
                              onBlur={(e) => {
                                field.onBlur();
                                const lon = e.target.valueAsNumber;
                                if (Number.isFinite(lon) && !form.getValues("timezone")) {
                                  form.setValue("timezone", timezoneFromLongitude(lon));
                                }
                              }}
                              data-testid="input-longitude"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Timezone
                          <FieldTip text="Auto-detected from longitude. Adjust if needed." />
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="America/New_York" {...field} data-testid="input-timezone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <LocationPicker
                  latitude={form.watch("latitude")}
                  longitude={form.watch("longitude")}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2 — System Specs */}
          {currentStep === 2 && (
            <Card data-testid="step-system-specs">
              <CardHeader>
                <CardTitle>System Specifications</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <NumberField form={form} name="capacity_kw_dc" label="DC capacity (kW)" placeholder="5000" tip="Nameplate DC capacity. EcoXchange focuses on the 1–20 MW band." />
                <NumberField form={form} name="tilt_deg" label="Tilt (degrees)" placeholder="20" tip="Auto-suggested as latitude × 0.76 for fixed-tilt arrays." />
                <NumberField form={form} name="azimuth_deg" label="Azimuth (degrees)" placeholder="180" tip="180 = true south, 90 = east, 270 = west." />
                <FormField
                  control={form.control}
                  name="module_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Module type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue(
                            "module_efficiency",
                            MODULE_EFFICIENCY_DEFAULTS[v as keyof typeof MODULE_EFFICIENCY_DEFAULTS],
                          );
                        }}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-module-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MODULE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <NumberField form={form} name="module_efficiency" label="Module efficiency" placeholder="0.20" step="0.01" tip="Pre-filled from module type. Fraction (0.20 = 20%)." />
                <FormField
                  control={form.control}
                  name="racking_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Racking type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-racking-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RACKING_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <NumberField form={form} name="dc_ac_ratio" label="DC/AC ratio" placeholder="1.2" step="0.05" tip="Ratio of DC array capacity to AC inverter capacity. Typically 1.1–1.3." />
                <FormField
                  control={form.control}
                  name="commissioning_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Commissioning date
                        <FieldTip text="When the system started (or will start) operating." />
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-commissioning-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3 — Inverter & Monitoring */}
          {currentStep === 3 && (
            <Card data-testid="step-inverter">
              <CardHeader>
                <CardTitle>Inverter & Monitoring</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
                  For the backtest, we only need your location and system specs.
                  Inverter API access is needed later for live production
                  verification — you can skip this for now.
                </div>
                <FormField
                  control={form.control}
                  name="inverter_brand"
                  render={({ field }) => (
                    <FormItem className="max-w-sm">
                      <FormLabel>Inverter brand</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-inverter-brand">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INVERTER_BRANDS.map((b) => (
                            <SelectItem key={b} value={b}>
                              {LABELS[b]}
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
                  name="has_monitoring_access"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border border-border p-3 max-w-sm">
                      <FormLabel className="mb-0">
                        API access to your inverter monitoring portal?
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-monitoring"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {watchMonitoring && (
                  <FormField
                    control={form.control}
                    name="inverter_plant_id"
                    render={({ field }) => (
                      <FormItem className="max-w-sm">
                        <FormLabel>Inverter plant ID</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-plant-id" />
                        </FormControl>
                        <FormDescription>
                          We'll need this for live verification.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="developer_notes"
                  render={({ field }) => (
                    <FormItem className="max-w-xl">
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} data-testid="input-notes" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 4 — Off-take & Revenue */}
          {currentStep === 4 && (
            <Card data-testid="step-offtake">
              <CardHeader>
                <CardTitle>Off-take & Revenue</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="offtake_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Off-take type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-offtake-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OFFTAKE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchOfftake === "ppa" && (
                  <>
                    <NumberField form={form} name="ppa_rate_per_kwh" label="PPA rate ($/kWh)" placeholder="0.08" step="0.001" tip="Contracted price per kWh." />
                    <NumberField form={form} name="ppa_escalator" label="PPA escalator (%/yr)" placeholder="2" step="0.1" tip="Annual price escalation. Typically ~2%." />
                  </>
                )}
                <FormField
                  control={form.control}
                  name="utility_provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Utility provider (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Georgia Power" {...field} data-testid="input-utility" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <NumberField form={form} name="equity_raise_requested" label="Equity raise requested ($) — optional" placeholder="2000000" tip="Informational — what you're looking to raise." />
              </CardContent>
            </Card>
          )}

          {/* Step 5 — Review */}
          {currentStep === 5 && (
            <Card data-testid="step-review">
              <CardHeader>
                <CardTitle>Review & Run Backtest</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ReviewSummary values={form.getValues()} onEdit={setCurrentStep} />
                <div className="space-y-3 rounded-md border border-border p-4">
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={onRun}
                    data-testid="button-run-backtest"
                  >
                    <Rocket className="h-5 w-5" />
                    Run Production Backtest
                  </Button>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    We'll pull 12 months of real satellite irradiance data from
                    NASA for your project's location and run it through our
                    production verification engine. This typically takes about
                    30–60 seconds. No inverter data is needed — the backtest
                    validates our expected generation model against actual
                    weather conditions at your site.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="mt-6 flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              data-testid="button-back"
            >
              Back
            </Button>
            {currentStep < STEPS.length && (
              <Button onClick={handleNext} data-testid="button-next">
                Next
              </Button>
            )}
          </div>
        </form>
      </Form>
    </DashboardLayout>
  );
}

function NumberField({
  form,
  name,
  label,
  placeholder,
  tip,
  step,
}: {
  form: ReturnType<typeof useForm<DeveloperIntakeData>>;
  name: keyof DeveloperIntakeData;
  label: string;
  placeholder?: string;
  tip?: string;
  step?: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {tip && <FieldTip text={tip} />}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              step={step ?? "any"}
              placeholder={placeholder}
              {...field}
              value={(field.value as number | undefined) ?? ""}
              onChange={(e) =>
                field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)
              }
              data-testid={`input-${String(name)}`}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ReviewSummary({
  values,
  onEdit,
}: {
  values: DeveloperIntakeData;
  onEdit: (step: number) => void;
}) {
  const rows: { label: string; value: string; step: number }[] = [
    { label: "Project", value: values.name, step: 1 },
    {
      label: "Location",
      value: `${values.latitude?.toFixed?.(4)}°, ${values.longitude?.toFixed?.(4)}° (${values.timezone})`,
      step: 1,
    },
    { label: "DC capacity", value: `${values.capacity_kw_dc} kW`, step: 2 },
    {
      label: "Orientation",
      value: `${values.tilt_deg}° tilt / ${values.azimuth_deg}° azimuth`,
      step: 2,
    },
    {
      label: "Modules",
      value: `${LABELS[values.module_type]} · ${(values.module_efficiency * 100).toFixed(0)}% · ${LABELS[values.racking_type]}`,
      step: 2,
    },
    { label: "Inverter", value: LABELS[values.inverter_brand], step: 3 },
    {
      label: "Off-take",
      value:
        values.offtake_type === "ppa"
          ? `PPA · $${values.ppa_rate_per_kwh}/kWh`
          : LABELS[values.offtake_type],
      step: 4,
    },
  ];
  return (
    <dl className="divide-y divide-border rounded-md border border-border">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="flex items-center gap-3 font-medium">
            <span>{r.value}</span>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => onEdit(r.step)}
              data-testid={`button-edit-step-${r.step}`}
            >
              Edit
            </button>
          </dd>
        </div>
      ))}
    </dl>
  );
}
