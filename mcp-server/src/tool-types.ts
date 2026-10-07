import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { toAnnotations, type ToolAccess, type ToolAnnotationHints } from "./annotations.js";
import { ApiError, type ApiClient } from "./api-client.js";

const MAX_RESULT_CHARS = 100_000;

export type ToolResult = CallToolResult;

export interface ToolRegistration {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  annotations: ToolAnnotationHints;
}

// The only place the SDK's registerTool is called, so tool code and tests stay free of casts.
export interface ToolRegistrar {
  registerTool(registration: ToolRegistration, handler: (args: unknown) => Promise<ToolResult>): void;
}

export function toRegistrar(server: McpServer): ToolRegistrar {
  return {
    registerTool({ name, ...config }, handler) {
      server.registerTool(name, config, async (args) => handler(args));
    },
  };
}

export interface ToolModule {
  name: string;
  access: ToolAccess;
  description: string;
  register(registrar: ToolRegistrar, api: ApiClient): void;
}

export interface ToolDefinition<Shape extends z.ZodRawShape> {
  name: string;
  title: string;
  description: string;
  access: ToolAccess;
  inputSchema: Shape;
  handler(args: z.infer<z.ZodObject<Shape>>, api: ApiClient): Promise<unknown>;
}

function textResult(text: string, isError = false): ToolResult {
  return { isError, content: [{ type: "text", text }] };
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
    register(registrar, api) {
      const schema = z.object(definition.inputSchema);
      registrar.registerTool(
        {
          name: definition.name,
          title: definition.title,
          description: definition.description,
          inputSchema: definition.inputSchema,
          annotations: toAnnotations(definition.access, definition.title),
        },
        async (args) => {
          try {
            const data = await definition.handler(schema.parse(args), api);
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
