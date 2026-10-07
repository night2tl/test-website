import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const getProduct = defineTool({
  name: "get_product",
  title: "Get product",
  description:
    "Retrieve a single product by its ID. Use this when you need details about a specific product such as its name, price, or category.",
  access: "read",
  inputSchema: {
    id: z.string().describe("The product ID (e.g. 'p1')."),
  },
  handler: async ({ id }, api) =>
    api.get(`/api/products/${encodeURIComponent(id)}`),
});
