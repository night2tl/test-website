import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const listProducts = defineTool({
  name: "list_products",
  title: "List products",
  description:
    "List all products in the public catalog. Optionally filter by category ('plans' or 'services'). Use this when someone asks what plans or services are available for sale.",
  access: "read",
  inputSchema: {
    category: z
      .string()
      .optional()
      .describe("Filter products by category. Accepted values: 'plans' or 'services'."),
  },
  handler: async ({ category }, api) =>
    api.get("/api/products", { query: { category } }),
});
