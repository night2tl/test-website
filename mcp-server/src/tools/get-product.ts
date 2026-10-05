import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolConfig } from "./list-products.js";

export function register(server: McpServer, config: ToolConfig): void {
  server.registerTool(
    "get_product",
    {
      description:
        "Retrieve a single product by its ID. Use this to look up pricing or details for a specific plan or service.",
      inputSchema: {
        id: z.string().describe('The product ID (e.g. "p1").'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) => {
      const url = new URL(`/api/products/${encodeURIComponent(id)}`, config.baseUrl);

      const res = await fetch(url.toString());
      const text = await res.text();

      if (!res.ok) {
        return {
          content: [{ type: "text" as const, text: `HTTP ${res.status}: ${text}` }],
          isError: true,
        };
      }

      return { content: [{ type: "text" as const, text }] };
    },
  );
}
