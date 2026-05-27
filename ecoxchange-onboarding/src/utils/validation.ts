import { z } from "zod";

export const SubmissionSchema = z
  .object({
    developer_name: z.string().min(2).max(100),
    developer_email: z.string().email(),
    developer_company: z.string().max(200).optional(),
    developer_phone: z.string().max(40).optional(),

    project_name: z.string().min(2).max(200),
    latitude: z.number().min(24).max(50),
    longitude: z.number().min(-130).max(-60),
    capacity_kw_dc: z.number().min(100).max(20000),
    tilt_deg: z.number().min(0).max(60),
    azimuth_deg: z.number().min(90).max(270),
    module_efficiency: z.number().min(0.15).max(0.25).default(0.2),
    system_losses: z.number().min(0.05).max(0.25).default(0.14),
    degradation_rate: z.number().min(0.003).max(0.015).default(0.0075),
    commissioning_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

    inverter_brand: z.enum(["solaredge", "enphase", "fronius", "sma", "other"]),
    inverter_api_key: z.string().min(1).max(500).optional(),
    inverter_plant_id: z.string().min(1).max(200).optional(),

    utility_provider: z.string().max(200).optional(),
    utility_account_ref: z.string().max(200).optional(),

    offtake_type: z
      .enum(["ppa", "community_solar", "net_metering", "merchant"])
      .optional(),
    ppa_rate_per_kwh: z.number().min(0.02).max(0.3).optional(),
    ppa_escalator: z.number().min(0).max(0.05).default(0.02),
    ppa_tenor_years: z.number().min(5).max(30).optional(),

    equity_raise_target: z.number().min(500_000).max(10_000_000).optional(),
    equity_raise_min: z.number().min(100_000).max(10_000_000).optional(),
  })
  .strict();

export type ValidatedSubmission = z.infer<typeof SubmissionSchema>;

export const VerifyCredentialsSchema = z
  .object({
    brand: z.enum(["solaredge", "enphase", "fronius", "sma"]),
    api_key: z.string().min(1),
    plant_id: z.string().min(1),
  })
  .strict();
