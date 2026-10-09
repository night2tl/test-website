import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import type { Config } from "./config.js";

export const RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource";

export function protectedResourceMetadata(config: Config) {
  return {
    resource: `${config.publicUrl}/mcp`,
    authorization_servers: [config.issuer],
    bearer_methods_supported: ["header"],
  };
}

// RFC 9728 / RFC 6750: tells an MCP client where to sign in instead of leaving it with a bare 401.
export function bearerChallenge(config: Config): string {
  return `Bearer resource_metadata="${config.publicUrl}${RESOURCE_METADATA_PATH}"`;
}

export function callerAuthorization(headers: IncomingHttpHeaders): string | undefined {
  const value = headers.authorization;
  if (typeof value !== "string") return undefined;
  const match = /^Bearer\s+(\S+)$/i.exec(value.trim());
  return match ? `Bearer ${match[1]}` : undefined;
}

export const INBOUND_CHALLENGE = 'Bearer realm="mcp"';

const digest = (value: string): Buffer => createHash("sha256").update(value).digest();

// Constant-time: both sides are hashed to equal length first, so neither length nor content leaks.
export function hasInboundToken(headers: IncomingHttpHeaders, expected: string): boolean {
  const value = headers.authorization;
  if (typeof value !== "string") return false;
  const match = /^Bearer\s+(\S+)$/i.exec(value.trim());
  return match !== null && timingSafeEqual(digest(match[1] ?? ""), digest(expected));
}
