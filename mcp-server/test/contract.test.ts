import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../src/api-client.js";
import { tools } from "../src/tools/index.js";

interface ManifestParam {
  name: string;
  in: "path" | "query" | "body";
  required: boolean;
  sample: unknown;
}

interface ManifestTool {
  name: string;
  method: string;
  route: string;
  access: "read" | "write" | "destructive";
  params: ManifestParam[];
}

interface Call {
  method: string;
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
}

interface Registration {
  config: {
    inputSchema?: z.ZodRawShape;
    annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
  };
  handler: (args: unknown, extra: unknown) => Promise<{ isError?: boolean }>;
}

const manifest = JSON.parse(
  readFileSync(new URL("../../tools.manifest.json", import.meta.url), "utf8")
) as { tools: ManifestTool[] };

function recordingApi(calls: Call[]): ApiClient {
  const record =
    (method: string) =>
    async (path: string, options?: { query?: Record<string, unknown>; body?: unknown }) => {
      calls.push({ method, path, query: options?.query, body: options?.body });
      return {};
    };
  return {
    get: record("GET"),
    post: record("POST"),
    put: record("PUT"),
    patch: record("PATCH"),
    delete: record("DELETE"),
  } as ApiClient;
}

function registerAll(calls: Call[]): Map<string, Registration> {
  const registered = new Map<string, Registration>();
  const fakeServer = {
    registerTool: (name: string, config: Registration["config"], handler: Registration["handler"]) => {
      registered.set(name, { config, handler });
    },
  } as unknown as McpServer;
  for (const tool of tools) tool.register(fakeServer, recordingApi(calls));
  return registered;
}

// `:id`, `{id}` and `[id]` all mean the same path parameter.
function expectedPath(route: string, params: ManifestParam[]): string {
  const normalized = route.replace(/:([A-Za-z_]\w*)|\{([^}]+)\}|\[([^\]]+)\]/g, (_m, a, b, c) => `{${a ?? b ?? c}}`);
  return params
    .filter((param) => param.in === "path")
    .reduce((path, param) => path.replace(`{${param.name}}`, encodeURIComponent(String(param.sample))), normalized);
}

function sampleArgs(params: ManifestParam[]): Record<string, unknown> {
  return Object.fromEntries(params.map((param) => [param.name, param.sample]));
}

test("the server registers exactly the tools in tools.manifest.json", () => {
  const registered = [...registerAll([]).keys()].sort();
  assert.deepEqual(registered, manifest.tools.map((tool) => tool.name).sort());
});

for (const expected of manifest.tools) {
  test(`${expected.name}: access matches the manifest`, () => {
    const registration = registerAll([]).get(expected.name);
    assert.ok(registration, `${expected.name} is not registered`);
    const annotations = registration.config.annotations;
    assert.equal(annotations?.readOnlyHint, expected.access === "read");
    assert.equal(annotations?.destructiveHint, expected.access === "destructive");
  });

  test(`${expected.name}: input schema matches the manifest parameters`, () => {
    const shape = registerAll([]).get(expected.name)?.config.inputSchema ?? {};
    assert.deepEqual(Object.keys(shape).sort(), expected.params.map((p) => p.name).sort());

    const schema = z.object(shape).strict();
    assert.ok(schema.safeParse(sampleArgs(expected.params)).success, "sample arguments are rejected");
    for (const param of expected.params) {
      const without = sampleArgs(expected.params.filter((other) => other !== param));
      assert.equal(
        schema.safeParse(without).success,
        !param.required,
        `${param.name} must be ${param.required ? "required" : "optional"}`
      );
    }
  });

  test(`${expected.name}: calls ${expected.method} ${expected.route} and nothing else`, async () => {
    const calls: Call[] = [];
    const registration = registerAll(calls).get(expected.name);
    assert.ok(registration, `${expected.name} is not registered`);

    const result = await registration.handler(sampleArgs(expected.params), {});

    assert.notEqual(result.isError, true);
    assert.equal(calls.length, 1, "a tool must make exactly one API call");
    const [call] = calls;
    assert.equal(call?.method, expected.method);
    assert.equal(call?.path, expectedPath(expected.route, expected.params));

    const queryNames = expected.params.filter((p) => p.in === "query").map((p) => p.name).sort();
    assert.deepEqual(Object.keys(call?.query ?? {}).sort(), queryNames);

    const bodyNames = expected.params.filter((p) => p.in === "body").map((p) => p.name).sort();
    if (bodyNames.length === 0) assert.equal(call?.body, undefined);
    else assert.deepEqual(Object.keys((call?.body ?? {}) as object).sort(), bodyNames);
  });
}
