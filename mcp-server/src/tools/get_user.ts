import { z } from "zod";
import { defineTool } from "../tool-types.js";

export const getUser = defineTool({
  name: "get_user",
  title: "Get user",
  description:
    "Retrieve a single user by their ID. Returns user details including name, email, and phone number. Use this when you need to look up information about a specific user. Returns personal data including name, email address, and phone number.",
  access: "read",
  inputSchema: {
    id: z.string().describe("The user ID (e.g. 'u1')."),
  },
  handler: async ({ id }, api) =>
    api.get(`/api/users/${encodeURIComponent(id)}`),
});
