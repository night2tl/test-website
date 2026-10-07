import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const createOrder = defineTool({
  name: "create_order",
  title: "Create order",
  description:
    "Create a new order. Accepts order details and returns the created order with an assigned ID and 'pending' status. Use this when placing a new order for a product. This tool modifies data.",
  access: "write",
  inputSchema: {
    productId: z.string().optional().describe("The product ID to order."),
    userId: z.string().optional().describe("The user ID placing the order."),
  },
  handler: async ({ productId, userId }, api) =>
    api.post("/api/orders", { body: { productId, userId } }),
});
