import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "./api-client.js";
import { tools } from "./tools/index.js";

export function createServer(api: ApiClient): McpServer {
  const server = new McpServer({ name: "mcp-server", version: "0.1.0" });
  for (const tool of tools) tool.register(server, api);
  return server;
}
