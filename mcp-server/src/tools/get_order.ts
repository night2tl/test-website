import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const getOrder = defineTool({
  name: "get_order",
  title: "Get order",
  description:
    "Retrieves a single order by its ID. Use when an agent needs to check the status or details of an existing order.",
  access: "read",
  inputSchema: {
    id: z.string().describe("The order ID to retrieve"),
  },
  handler: async ({ id }, api) =>
    api.get(`/api/orders/${encodeURIComponent(id)}`),
});
