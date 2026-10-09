import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const createOrder = defineTool({
  name: "create_order",
  title: "Create order",
  description:
    "Create a new order with a product and user reference. Returns the created order object with an auto-generated ID and 'pending' status. Use when an agent needs to place an order on behalf of a user. This tool performs a write operation.",
  access: "write",
  inputSchema: {
    productId: z
      .string()
      .optional()
      .describe("ID of the product to order (e.g. 'p2')"),
    userId: z
      .string()
      .optional()
      .describe("ID of the user placing the order (e.g. 'u1')"),
  },
  handler: async ({ productId, userId }, api) =>
    api.post("/api/orders", { body: { productId, userId } }),
});
