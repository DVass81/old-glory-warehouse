import { z } from "zod";

import { appEnvironmentSchema, dataProviderSchema } from "@/schemas/domain";

export const envSchema = z
  .object({
    NEXT_PUBLIC_APP_ENV: appEnvironmentSchema.default("development"),
    NEXT_PUBLIC_DATA_PROVIDER: dataProviderSchema.default("mock"),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().or(z.literal("")),
    NEXT_PUBLIC_ENABLE_REPORT_EXPORT: z.coerce.boolean().default(true),
    NEXT_PUBLIC_ENABLE_AUDIT_LOG: z.coerce.boolean().default(true),
  })
  .superRefine((value, context) => {
    if (value.NEXT_PUBLIC_DATA_PROVIDER !== "supabase") {
      return;
    }

    if (!value.NEXT_PUBLIC_SUPABASE_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_SUPABASE_URL"],
        message: "NEXT_PUBLIC_SUPABASE_URL is required when NEXT_PUBLIC_DATA_PROVIDER is supabase.",
      });
    }

    if (!value.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
        message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required when NEXT_PUBLIC_DATA_PROVIDER is supabase.",
      });
    }
  });

export type AppConfig = z.infer<typeof envSchema>;

export function parseEnv(input: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse({
    NEXT_PUBLIC_APP_ENV: input.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_DATA_PROVIDER: input.NEXT_PUBLIC_DATA_PROVIDER,
    NEXT_PUBLIC_SUPABASE_URL: input.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: input.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_ENABLE_REPORT_EXPORT: input.NEXT_PUBLIC_ENABLE_REPORT_EXPORT,
    NEXT_PUBLIC_ENABLE_AUDIT_LOG: input.NEXT_PUBLIC_ENABLE_AUDIT_LOG,
  });
}

export const env = parseEnv();
