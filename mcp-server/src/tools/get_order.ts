import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const getOrder = defineTool({
  name: "get_order",
  title: "Get order",
  description:
    "Retrieve a single order by its ID. Returns order details including its product, user, and status. Use this when you need to look up the status or details of a specific order.",
  access: "read",
  inputSchema: {
    id: z.string().describe("The order ID (e.g. 'o1')."),
  },
  handler: async ({ id }, api) =>
    api.get(`/api/orders/${encodeURIComponent(id)}`),
});
