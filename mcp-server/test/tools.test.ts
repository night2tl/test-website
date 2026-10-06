import assert from "node:assert/strict";
import { test } from "node:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "../src/api-client.js";
import { tools } from "../src/tools/index.js";

interface Registered {
  name: string;
  config: {
    description?: string;
    annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
  };
}

function registerAll(): Registered[] {
  const registered: Registered[] = [];
  const fakeServer = {
    registerTool: (name: string, config: Registered["config"]) => registered.push({ name, config }),
  } as unknown as McpServer;
  for (const tool of tools) tool.register(fakeServer, {} as ApiClient);
  return registered;
}

test("every tool registers exactly once under a unique snake_case name", () => {
  const registered = registerAll();
  assert.equal(registered.length, tools.length);
  const names = registered.map((entry) => entry.name);
  assert.equal(new Set(names).size, names.length);
  for (const name of names) assert.match(name, /^[a-z][a-z0-9_]*$/);
});

test("descriptions are present and plain ASCII", () => {
  for (const { name, config } of registerAll()) {
    assert.ok((config.description ?? "").length >= 20, `${name} needs a real description`);
    assert.match(config.description ?? "", /^[\x20-\x7E\n]+$/, `${name} has non-ASCII text`);
  }
});

test("annotations agree with each tool's declared access", () => {
  const registered = registerAll();
  tools.forEach((tool, index) => {
    const annotations = registered[index]?.config.annotations;
    assert.equal(annotations?.readOnlyHint, tool.access === "read", tool.name);
    assert.equal(annotations?.destructiveHint, tool.access === "destructive", tool.name);
  });
});
