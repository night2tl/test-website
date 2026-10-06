import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const getProduct = defineTool({
  name: "get_product",
  title: "Get product",
  description:
    "Retrieve a single product by its ID from the public catalog. Use this when someone asks about a specific plan or service.",
  access: "read",
  inputSchema: {
    id: z.string().describe("The product ID (e.g. 'p1', 'p2')."),
  },
  handler: async ({ id }, api) =>
    api.get(`/api/products/${encodeURIComponent(id)}`),
});
