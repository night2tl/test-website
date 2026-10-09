import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const searchProducts = defineTool({
  name: "search_products",
  title: "Search products",
  description:
    "Searches products by name using a case-insensitive substring match. Use when an agent needs to find products matching a keyword or partial name.",
  access: "read",
  inputSchema: {
    q: z.string().describe("Search query string to match against product names"),
  },
  handler: async ({ q }, api) =>
    api.get("/api/search", { query: { q } }),
});
