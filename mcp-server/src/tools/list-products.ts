import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface ToolConfig {
  baseUrl: string;
  authToken?: string;
}

export function register(server: McpServer, config: ToolConfig): void {
  server.registerTool(
    "list_products",
    {
      description:
        "List all products in the catalog, optionally filtered by category. Use this to retrieve available plans and services.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe(
            'Filter products by category (e.g. "plans", "services"). Omit to return all products.',
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ category }) => {
      const url = new URL("/api/products", config.baseUrl);
      if (category !== undefined) {
        url.searchParams.set("category", category);
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
