import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const listProducts = defineTool({
  name: "list_products",
  title: "List products",
  description:
    "List all products in the public catalog, optionally filtered by category (plans or services). Use when an agent needs to show available plans or services for sale.",
  access: "read",
  inputSchema: {
    category: z
      .string()
      .optional()
      .describe("Filter by product category, e.g. 'plans' or 'services'"),
  },
  handler: async ({ category }, api) =>
    api.get("/api/products", { query: { category } }),
});
