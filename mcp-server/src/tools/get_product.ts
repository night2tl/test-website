import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const getProduct = defineTool({
  name: "get_product",
  title: "Get product",
  description:
    "Retrieves a single product by its ID from the public catalog. Use when an agent needs details about a specific product.",
  access: "read",
  inputSchema: {
    id: z.string().describe("The product ID (e.g. 'p1', 'p2', 'p3')"),
  },
  handler: async ({ id }, api) =>
    api.get(`/api/products/${encodeURIComponent(id)}`),
});
