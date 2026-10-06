import { z } from "zod";

export type AuthMode = "passthrough" | "service-token" | "none";
export type CredentialSource = "caller-header" | "env-token" | "none";
export type Transport = "http" | "stdio";

const EnvSchema = z.object({
  API_BASE_URL: z.string().url(),
  AUTH_MODE: z.enum(["passthrough", "service-token", "none"]).default("none"),
  AUTH_ISSUER: z.string().url().optional(),
  MCP_PUBLIC_URL: z.string().url().optional(),
  API_AUTH_TOKEN: z.string().min(1).optional(),
  API_AUTH_HEADER: z.string().min(1).default("authorization"),
  API_AUTH_SCHEME: z.string().default("Bearer"),
  PORT: z.coerce.number().int().positive().default(3000),
});

export interface Config {
  apiBaseUrl: string;
  authMode: AuthMode;
  credential: CredentialSource;
  authHeader: string;
  authScheme: string;
  token?: string;
  issuer?: string;
  publicUrl?: string;
  port: number;
}

export class ConfigError extends Error {}

// stdio has no per-request headers, so a pass-through server falls back to the local user's token.
function pickCredential(mode: AuthMode, transport: Transport): CredentialSource {
  if (mode === "none") return "none";
  if (mode === "service-token") return "env-token";
  return transport === "http" ? "caller-header" : "env-token";
}

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

export function loadConfig(env: NodeJS.ProcessEnv, transport: Transport): Config {
  // An empty API_AUTH_SCHEME is meaningful (send the raw token), so it is the one empty value kept.
  const present = Object.fromEntries(
    Object.entries(env).filter(
      ([key, value]) => value !== undefined && (value !== "" || key === "API_AUTH_SCHEME")
    )
  );
  const parsed = EnvSchema.safeParse(present);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new ConfigError(`Invalid configuration: ${problems.join("; ")}`);
  }

  const values = parsed.data;
  const credential = pickCredential(values.AUTH_MODE, transport);
  if (credential === "env-token" && !values.API_AUTH_TOKEN) {
    throw new ConfigError("API_AUTH_TOKEN is required for this auth mode and transport");
  }
  if (credential === "caller-header" && (!values.AUTH_ISSUER || !values.MCP_PUBLIC_URL)) {
    throw new ConfigError("AUTH_ISSUER and MCP_PUBLIC_URL are required when callers bring their own token");
  }

  return {
    apiBaseUrl: stripTrailingSlash(values.API_BASE_URL),
    authMode: values.AUTH_MODE,
    credential,
    authHeader: values.API_AUTH_HEADER,
    authScheme: values.API_AUTH_SCHEME,
    token: values.API_AUTH_TOKEN,
    issuer: values.AUTH_ISSUER,
    publicUrl: values.MCP_PUBLIC_URL ? stripTrailingSlash(values.MCP_PUBLIC_URL) : undefined,
    port: values.PORT,
  };
}
