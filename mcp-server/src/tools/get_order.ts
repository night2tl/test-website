import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const getOrder = defineTool({
  name: "get_order",
  title: "Get order",
  description:
    "Retrieve a single order by its ID. Returns order details including the associated product and user IDs and payment status. Use when an agent needs to look up the status of a specific order. The response may contain personally identifiable information.",
  access: "read",
  inputSchema: {
    id: z.string().describe("The order ID to retrieve (e.g. 'o1')"),
  },
  handler: async ({ id }, api) =>
    api.get(`/api/orders/${encodeURIComponent(id)}`),
});
