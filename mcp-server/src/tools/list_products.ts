import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const listProducts = defineTool({
  name: "list_products",
  title: "List products",
  description:
    "List all products in the catalog, optionally filtered by category. Use this to browse available plans and services.",
  access: "read",
  inputSchema: {
    category: z
      .string()
      .optional()
      .describe("Filter products by category (e.g. 'plans', 'services')."),
  },
  handler: async ({ category }, api) =>
    api.get("/api/products", { query: { category } }),
});
