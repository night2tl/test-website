import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import { toAnnotations, type ToolAccess } from "./annotations.js";
import { ApiError, type ApiClient } from "./api-client.js";

const MAX_RESULT_CHARS = 100_000;

export interface ToolModule {
  name: string;
  access: ToolAccess;
  description: string;
  register(server: McpServer, api: ApiClient): void;
}

export interface ToolDefinition<Shape extends z.ZodRawShape> {
  name: string;
  title: string;
  description: string;
  access: ToolAccess;
  inputSchema: Shape;
  handler(args: z.infer<z.ZodObject<Shape>>, api: ApiClient): Promise<unknown>;
}

function textResult(text: string, isError = false) {
  return { isError, content: [{ type: "text" as const, text }] };
}

function describeApiError(error: ApiError): string {
  if (error.status === 401 || error.status === 403) {
    return `The API rejected the credentials (${error.status}). The user may need to sign in again or may not have access. ${error.body}`;
  }
  return `The API returned ${error.status}: ${error.body}`;
}

export function defineTool<Shape extends z.ZodRawShape>(definition: ToolDefinition<Shape>): ToolModule {
  return {
    name: definition.name,
    access: definition.access,
    description: definition.description,
    register(server, api) {
      server.registerTool(
        definition.name,
        {
          title: definition.title,
          description: definition.description,
          inputSchema: definition.inputSchema as z.ZodRawShape,
          annotations: toAnnotations(definition.access, definition.title),
        },
        async (args) => {
          try {
            // The SDK has already validated `args` against `inputSchema`.
            const data = await definition.handler(args as never, api);
            const text = JSON.stringify(data ?? null, null, 2);
            return textResult(
              text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}\n[truncated]` : text
            );
          } catch (error) {
            if (error instanceof ApiError) return textResult(describeApiError(error), true);
            throw error;
          }
        }
      );
    },
  };
}
