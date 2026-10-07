import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const listProducts = defineTool({
  name: "list_products",
  title: "List products",
  description:
    "List all products in the catalog, optionally filtered by category (e.g. 'plans' or 'services'). Use this when you need to browse or display the full product catalog or a subset of it.",
  access: "read",
  inputSchema: {
    category: z
      .string()
      .optional()
      .describe("Optional category to filter products by (e.g. 'plans', 'services')."),
  },
  handler: async ({ category }, api) =>
    api.get("/api/products", { query: { category } }),
});
