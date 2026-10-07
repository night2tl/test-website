import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const deleteOrder = defineTool({
  name: "delete_order",
  title: "Delete order",
  description:
    "Delete an existing order by its ID. Permanently removes the order. Use this when an order needs to be cancelled or removed. This tool modifies data.",
  access: "write",
  inputSchema: {
    id: z.string().describe("The order ID to delete (e.g. 'o1')."),
  },
  handler: async ({ id }, api) =>
    api.delete(`/api/orders/${encodeURIComponent(id)}`),
});
