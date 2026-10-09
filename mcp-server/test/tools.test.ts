import assert from "node:assert/strict";
import { test } from "node:test";
import type { ApiClient } from "../src/api-client.js";
import type { ToolRegistrar, ToolRegistration } from "../src/tool-types.js";
import { tools } from "../src/tools/index.js";

function registerAll(): ToolRegistration[] {
  const registered: ToolRegistration[] = [];
  const registrar: ToolRegistrar = {
    registerTool: (registration) => {
      registered.push(registration);
    },
  };
  for (const tool of tools) tool.register(registrar, {} as ApiClient);
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
  for (const { name, description } of registerAll()) {
    assert.ok(description.length >= 20, `${name} needs a real description`);
    assert.match(description, /^[\x20-\x7E\n]+$/, `${name} has non-ASCII text`);
  }
});

test("annotations agree with each tool's declared access", () => {
  const registered = registerAll();
  tools.forEach((tool, index) => {
    const annotations = registered[index]?.annotations;
    assert.equal(annotations?.readOnlyHint, tool.access === "read", tool.name);
    assert.equal(annotations?.destructiveHint, tool.access === "destructive", tool.name);
  });
});
