import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const searchProducts = defineTool({
  name: "search_products",
  title: "Search products",
  description:
    "Search products by name using a case-insensitive substring match. Use this when you need to find products matching a keyword or partial name.",
  access: "read",
  inputSchema: {
    q: z
      .string()
      .optional()
      .describe(
        "Search query string to match against product names (case-insensitive substring match). Defaults to empty string which returns all products.",
      ),
  },
  handler: async ({ q }, api) =>
    api.get("/api/search", { query: { q } }),
});
