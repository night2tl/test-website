import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolConfig } from "./list-products.js";

export function register(server: McpServer, config: ToolConfig): void {
  server.registerTool(
    "get_order",
    {
      description:
        "Retrieve a single order by its ID, including the associated product and user references and payment status. Use this to check order status.",
      inputSchema: {
        id: z.string().describe('The order ID (e.g. "o1").'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) => {
      const url = new URL(`/api/orders/${encodeURIComponent(id)}`, config.baseUrl);

      const headers: Record<string, string> = {};
      if (config.authToken) {
        headers["x-api-key"] = config.authToken;
      }

      const res = await fetch(url.toString(), { headers });
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
