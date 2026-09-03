import { z } from "zod";

import { ENVIRONMENT_CLASSES } from "./environment-class";

export const environmentClassSchema = z.enum(ENVIRONMENT_CLASSES);

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: environmentClassSchema,
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export const serverEnvSchema = z
  .object({
    APP_ENV: environmentClassSchema,
    NEXT_PUBLIC_APP_ENV: environmentClassSchema.optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    FACTORY_CUSTOMER_GATEWAY_URL: z.string().url(),
  })
  .superRefine((value, ctx) => {
    if (
      value.NEXT_PUBLIC_APP_ENV !== undefined &&
      value.NEXT_PUBLIC_APP_ENV !== value.APP_ENV
    ) {
      ctx.addIssue({
        code: "custom",
        message: "NEXT_PUBLIC_APP_ENV must match APP_ENV when both are set",
        path: ["NEXT_PUBLIC_APP_ENV"],
      });
    }

    if (value.FACTORY_CUSTOMER_GATEWAY_URL) {
      let gatewayUrl: URL;
      try {
        gatewayUrl = new URL(value.FACTORY_CUSTOMER_GATEWAY_URL);
      } catch {
        return;
      }

      const isLocalHost =
        gatewayUrl.hostname === "127.0.0.1" || gatewayUrl.hostname === "localhost";
      if (value.APP_ENV !== "local" && gatewayUrl.protocol !== "https:") {
        ctx.addIssue({
          code: "custom",
          message:
            "FACTORY_CUSTOMER_GATEWAY_URL must use HTTPS outside local development",
          path: ["FACTORY_CUSTOMER_GATEWAY_URL"],
        });
      }

      if (value.APP_ENV === "local" && !isLocalHost && gatewayUrl.protocol !== "https:") {
        ctx.addIssue({
          code: "custom",
          message:
            "FACTORY_CUSTOMER_GATEWAY_URL must use HTTPS when not pointing at localhost",
          path: ["FACTORY_CUSTOMER_GATEWAY_URL"],
        });
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvValidationError";
  }
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "env";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export function parseServerEnv(
  env: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse({
    APP_ENV: env.APP_ENV,
    NEXT_PUBLIC_APP_ENV: env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    FACTORY_CUSTOMER_GATEWAY_URL: env.FACTORY_CUSTOMER_GATEWAY_URL,
  });

  if (!result.success) {
    throw new EnvValidationError(formatZodError(result.error));
  }

  return result.data;
}

export function parsePublicEnv(
  env: Record<string, string | undefined>,
): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_ENV: env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) {
    throw new EnvValidationError(formatZodError(result.error));
  }

  return result.data;
}

export function toClientSafeConfig(publicEnv: PublicEnv) {
  return {
    environmentClass: publicEnv.NEXT_PUBLIC_APP_ENV,
    supabaseUrl: publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export const SERVER_ONLY_ENV_KEYS = [
  "APP_ENV",
  "FACTORY_CUSTOMER_GATEWAY_URL",
] as const;

export const PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

export const FORBIDDEN_CLIENT_ENV_KEYS = [
  "FACTORY_CUSTOMER_GATEWAY_URL",
  "SUPABASE_SECRET_KEY",
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;
