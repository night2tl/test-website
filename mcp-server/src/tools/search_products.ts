import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const searchProducts = defineTool({
  name: "search_products",
  title: "Search products",
  description:
    "Search the product catalog by name substring (case-insensitive). Use this when someone asks to find a product by name or keyword.",
  access: "read",
  inputSchema: {
    q: z.string().describe("Search term matched case-insensitively against product names."),
  },
  handler: async ({ q }, api) =>
    api.get("/api/search", { query: { q } }),
});
