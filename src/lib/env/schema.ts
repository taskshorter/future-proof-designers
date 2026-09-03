import { z } from "zod";

import { ENVIRONMENT_CLASSES } from "./environment-class";

export const environmentClassSchema = z.enum(ENVIRONMENT_CLASSES);

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: environmentClassSchema,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export const serverEnvSchema = z
  .object({
    APP_ENV: environmentClassSchema,
    NEXT_PUBLIC_APP_ENV: environmentClassSchema.optional(),
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
  });

  if (!result.success) {
    throw new EnvValidationError(formatZodError(result.error));
  }

  return result.data;
}

export function toClientSafeConfig(publicEnv: PublicEnv) {
  return {
    environmentClass: publicEnv.NEXT_PUBLIC_APP_ENV,
  };
}

export const SERVER_ONLY_ENV_KEYS = ["APP_ENV"] as const;

export const PUBLIC_ENV_KEYS = ["NEXT_PUBLIC_APP_ENV"] as const;
