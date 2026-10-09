import { createServer as createHttpServer } from "node:http";
import type { IncomingMessage, OutgoingHttpHeaders, Server, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createApiClient } from "./api-client.js";
import {
  bearerChallenge,
  callerAuthorization,
  hasInboundToken,
  INBOUND_CHALLENGE,
  protectedResourceMetadata,
  RESOURCE_METADATA_PATH,
} from "./auth.js";
import type { Config } from "./config.js";
import { createServer } from "./server.js";

const MAX_BODY_BYTES = 1_000_000;

class BodyError extends Error {
  constructor(readonly status: number) {
    super("Invalid request body");
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

function logError(error: unknown) {
  console.error("MCP server error:", error);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new BodyError(413);
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw === "") return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new BodyError(400);
  }
}

// The SDK writes the whole response itself, so a rejected caller token is turned into a 401 as it goes out.
function challengeOnUnauthorized(res: ServerResponse, challenge: string, state: { unauthorized: boolean }) {
  return new Proxy(res, {
    get(target, prop) {
      if (prop === "writeHead") {
        return (status: number, headers?: OutgoingHttpHeaders) =>
          state.unauthorized
            ? target.writeHead(401, { ...headers, "www-authenticate": challenge })
            : target.writeHead(status, headers);
      }
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

async function handle(config: Config, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");

  if (pathname === "/healthz") return sendJson(res, 200, { ok: true });
  if (
    config.credential === "caller-header" &&
    req.method === "GET" &&
    pathname.startsWith(RESOURCE_METADATA_PATH)
  ) {
    return sendJson(res, 200, protectedResourceMetadata(config));
  }
  if (pathname !== "/mcp") return sendJson(res, 404, { error: "Not Found" });

  let authorization: string | undefined;
  if (config.credential === "caller-header") {
    authorization = callerAuthorization(req.headers);
    if (!authorization) {
      return sendJson(res, 401, { error: "Unauthorized" }, { "www-authenticate": bearerChallenge(config) });
    }
  } else if (config.inboundToken !== undefined && !hasInboundToken(req.headers, config.inboundToken)) {
    return sendJson(res, 401, { error: "Unauthorized" }, { "www-authenticate": INBOUND_CHALLENGE });
  }
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method Not Allowed" }, { allow: "POST" });

  let body: unknown;
  try {
    body = await readJson(req);
  } catch (error) {
    if (error instanceof BodyError) return sendJson(res, error.status, { error: error.message });
    throw error;
  }

  // Stateless: a fresh server per request carries this caller's credential and nothing else.
  const upstream = { unauthorized: false };
  const server = createServer(
    createApiClient(config, authorization, () => {
      upstream.unauthorized = true;
    })
  );
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    transport.close().catch(logError);
    server.close().catch(logError);
  });
  await server.connect(transport);
  await transport.handleRequest(req, challengeOnUnauthorized(res, bearerChallenge(config), upstream), body);
}

export function createHttpApp(config: Config): Server {
  return createHttpServer((req, res) => {
    handle(config, req, res).catch((error) => {
      logError(error);
      if (!res.headersSent) sendJson(res, 500, { error: "Internal Server Error" });
    });
  });
}
