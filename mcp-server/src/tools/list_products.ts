import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const listProducts = defineTool({
  name: "list_products",
  title: "List products",
  description:
    "Lists all products in the public catalog. Optionally filter by category ('plans' or 'services'). Use when an agent needs to show available products or pricing.",
  access: "read",
  inputSchema: {
    category: z
      .string()
      .optional()
      .describe("Filter by category: 'plans' or 'services'"),
  },
  handler: async ({ category }, api) =>
    api.get("/api/products", { query: { category } }),
});
