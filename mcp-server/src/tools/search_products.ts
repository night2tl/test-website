import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const searchProducts = defineTool({
  name: "search_products",
  title: "Search products",
  description:
    "Search the product catalog by name. Returns all products whose name contains the query string (case-insensitive). Use this when you need to find a product by keyword.",
  access: "read",
  inputSchema: {
    q: z
      .string()
      .optional()
      .describe(
        "Search term matched against product names (case-insensitive). Omitting returns all products."
      ),
  },
  handler: async ({ q }, api) => api.get("/api/search", { query: { q } }),
});
