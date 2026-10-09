import { z } from "zod";

export type AuthMode = "passthrough" | "service-token" | "none";
export type CredentialSource = "caller-header" | "env-token" | "none";
export type Transport = "http" | "stdio";

export interface StaticHeader {
  name: string;
  envVar: string;
  required: boolean;
}

// Written by the host from the tools' header parameters; values come from the deployer's env.
const STATIC_HEADERS: readonly StaticHeader[] = [];
const HEADER_VALUE = /^[\x20-\x7e]+$/;

const EnvSchema = z.object({
  API_BASE_URL: z.string().url(),
  AUTH_MODE: z.enum(["passthrough", "service-token", "none"]).default("none"),
  AUTH_ISSUER: z.string().url().optional(),
  MCP_PUBLIC_URL: z.string().url().optional(),
  API_AUTH_TOKEN: z.string().min(1).optional(),
  API_AUTH_HEADER: z.string().min(1).default("authorization"),
  API_AUTH_SCHEME: z.string().default("Bearer"),
  MCP_INBOUND_TOKEN: z.string().min(16, "must be at least 16 characters").optional(),
  MCP_ALLOW_UNAUTHENTICATED: z.enum(["true", "false"]).default("false"),
  PORT: z.coerce.number().int().positive().default(3000),
});

export interface Config {
  apiBaseUrl: string;
  authMode: AuthMode;
  credential: CredentialSource;
  authHeader: string;
  authScheme: string;
  token?: string;
  staticHeaders: ReadonlyArray<{ name: string; value: string }>;
  issuer?: string;
  publicUrl?: string;
  // Shared secret every HTTP caller must present when the server holds the API credential itself.
  inboundToken?: string;
  allowUnauthenticated: boolean;
  port: number;
}

export class ConfigError extends Error {}

// stdio has no per-request headers, so a pass-through server falls back to the local user's token.
function pickCredential(mode: AuthMode, transport: Transport): CredentialSource {
  if (mode === "none") return "none";
  if (mode === "service-token") return "env-token";
  return transport === "http" ? "caller-header" : "env-token";
}

function loadStaticHeaders(
  env: Record<string, string | undefined>,
  authHeader: string
): Array<{ name: string; value: string }> {
  const headers: Array<{ name: string; value: string }> = [];
  for (const { name, envVar, required } of STATIC_HEADERS) {
    // The auth mode owns the credential header.
    if (name === authHeader.toLowerCase()) continue;
    const value = env[envVar];
    if (value === undefined) {
      if (required) throw new ConfigError(`${envVar} is required: the API expects the "${name}" header`);
      continue;
    }
    if (!HEADER_VALUE.test(value)) {
      throw new ConfigError(`${envVar} must contain only printable ASCII (no CR, LF or control characters)`);
    }
    headers.push({ name, value });
  }
  return headers;
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

  const allowUnauthenticated = values.MCP_ALLOW_UNAUTHENTICATED === "true";
  const guarded = transport === "http" && credential !== "caller-header";
  if (guarded && !values.MCP_INBOUND_TOKEN && !allowUnauthenticated) {
    throw new ConfigError(
      "MCP_INBOUND_TOKEN is required: this server calls the API with its own credential, so /mcp must be protected. " +
        "Set MCP_ALLOW_UNAUTHENTICATED=true only to knowingly serve it without authentication"
    );
  }

  const staticHeaders = loadStaticHeaders(present, values.API_AUTH_HEADER);

  return {
    apiBaseUrl: stripTrailingSlash(values.API_BASE_URL),
    authMode: values.AUTH_MODE,
    credential,
    authHeader: values.API_AUTH_HEADER,
    authScheme: values.API_AUTH_SCHEME,
    token: values.API_AUTH_TOKEN,
    staticHeaders,
    issuer: values.AUTH_ISSUER,
    publicUrl: values.MCP_PUBLIC_URL ? stripTrailingSlash(values.MCP_PUBLIC_URL) : undefined,
    inboundToken: credential === "caller-header" ? undefined : values.MCP_INBOUND_TOKEN,
    allowUnauthenticated,
    port: values.PORT,
  };
}
