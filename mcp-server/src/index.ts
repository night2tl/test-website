import { randomUUID } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";
import type { ToolConfig } from "./tools/list-products.js";

function loadConfig(): ToolConfig {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    console.error("Error: API_BASE_URL environment variable is required.");
    process.exit(1);
  }

  return {
    baseUrl,
    authToken: process.env.API_AUTH_TOKEN,
  };
}

async function startStdio(config: ToolConfig): Promise<void> {
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running on stdio");
}

async function startHttp(config: ToolConfig): Promise<void> {
  const server = createServer(config);
  const port = parseInt(process.env.PORT ?? "3000", 10);

  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    try {
      if (req.method === "POST") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const body: unknown = JSON.parse(Buffer.concat(chunks).toString());

        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports.has(sessionId)) {
          transport = transports.get(sessionId)!;
        } else if (!sessionId) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
          });
          transport.onclose = () => {
            if (transport.sessionId) {
              transports.delete(transport.sessionId);
            }
          };
          await server.connect(transport);
          if (transport.sessionId) {
            transports.set(transport.sessionId, transport);
          }
        } else {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid or expired session" }));
          return;
        }

        await transport.handleRequest(req, res, body);
      } else if (req.method === "GET") {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        if (!sessionId || !transports.has(sessionId)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid or missing session ID" }));
          return;
        }

        await transports.get(sessionId)!.handleRequest(req, res);
      } else if (req.method === "DELETE") {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        if (sessionId && transports.has(sessionId)) {
          const transport = transports.get(sessionId)!;
          await transport.handleRequest(req, res);
          transports.delete(sessionId);
        } else {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid or missing session ID" }));
        }
      } else {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Method not allowed" }));
      }
    } catch (err) {
      console.error("Error handling MCP request:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
  });

  httpServer.listen(port, () => {
    console.error(`MCP server listening on http://localhost:${port}/mcp`);
  });
}

const config = loadConfig();
const useStdio = process.argv.includes("--stdio");

if (useStdio) {
  startStdio(config).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
} else {
  startHttp(config).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
