import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SESSION_SECRET: z.string().min(32).optional(),
  DATABASE_URL: z.string().url().optional(),
  PERSONA_API_KEY: z.string().min(1).optional(),
  PERSONA_TEMPLATE_ID: z.string().min(1).optional(),
  PERSONA_WEBHOOK_SECRET: z.string().min(16).optional(),
});

const parsed = schema.parse(process.env);
const errors: string[] = [];
if (parsed.NODE_ENV === "production") {
  if (!parsed.SESSION_SECRET) errors.push("SESSION_SECRET (minimum 32 characters)");
  if (!parsed.DATABASE_URL) errors.push("DATABASE_URL");
}
if (Boolean(parsed.PERSONA_API_KEY) !== Boolean(parsed.PERSONA_TEMPLATE_ID)) {
  errors.push("PERSONA_API_KEY and PERSONA_TEMPLATE_ID must be configured together");
}
if (errors.length) throw new Error(`Invalid runtime configuration: ${errors.join(", ")}`);

export const runtimeConfig = {
  ...parsed,
  personaConfigured: Boolean(parsed.PERSONA_API_KEY && parsed.PERSONA_TEMPLATE_ID && parsed.PERSONA_WEBHOOK_SECRET),
  persistentArtifacts: Boolean(parsed.DATABASE_URL),
};
