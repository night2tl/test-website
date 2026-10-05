import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolConfig } from "./list-products.js";

export function register(server: McpServer, config: ToolConfig): void {
  server.registerTool(
    "search_products",
    {
      description:
        "Search products by name substring. Use this when the user asks to find a product by keyword rather than exact ID.",
      inputSchema: {
        q: z
          .string()
          .optional()
          .describe(
            "Case-insensitive search term matched against product names. Omitting returns all products.",
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ q }) => {
      const url = new URL("/api/search", config.baseUrl);
      if (q !== undefined) {
        url.searchParams.set("q", q);
      }

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
