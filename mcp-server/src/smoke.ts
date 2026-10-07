import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createApiClient } from "./api-client.js";
import { loadConfig, type Config } from "./config.js";
import { createHttpApp } from "./http.js";

export interface SmokeOptions {
  env: NodeJS.ProcessEnv;
  token?: string;
  call?: { tool: string; args: unknown };
  allowWrite?: boolean;
  manifestPath?: URL;
}

export interface SmokeResult {
  ok: boolean;
  lines: string[];
}

interface RpcResponse {
  result?: {
    tools?: ServedTool[];
    isError?: boolean;
    content?: Array<{ text?: string }>;
  };
  error?: { message: string };
}

interface ServedTool {
  name: string;
  annotations?: { readOnlyHint?: boolean };
}

interface ManifestTool {
  name: string;
  access: "read" | "write" | "destructive";
}

const DEFAULT_MANIFEST = new URL("../../tools.manifest.json", import.meta.url);

async function rpc(
  url: string,
  method: string,
  params: unknown,
  headers: Record<string, string>
): Promise<RpcResponse> {
  const response = await fetch(`${url}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`${method} returned HTTP ${response.status}`);
  return (await response.json()) as RpcResponse;
}

// The in-process server only needs sign-in settings that never leave this machine.
function smokeConfig(env: NodeJS.ProcessEnv): Config {
  return loadConfig(
    { AUTH_ISSUER: "https://smoke.invalid", MCP_PUBLIC_URL: "http://localhost", ...env },
    "http"
  );
}

export async function runSmoke(options: SmokeOptions): Promise<SmokeResult> {
  const lines: string[] = [];
  const fail = (message: string): SmokeResult => ({ ok: false, lines: [...lines, `FAIL ${message}`] });
  const manifest = JSON.parse(readFileSync(options.manifestPath ?? DEFAULT_MANIFEST, "utf8")) as {
    tools: ManifestTool[];
  };

  const config = smokeConfig(options.env);
  const headers: Record<string, string> = {};
  if (config.credential === "caller-header") {
    if (!options.token) return fail("This server expects a caller token: pass --token <token> or set SMOKE_TOKEN.");
    headers.authorization = `Bearer ${options.token}`;
  }

  const app = createHttpApp(config);
  await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;

  try {
    const listed = await rpc(url, "tools/list", {}, headers);
    const served = new Map<string, ServedTool>(
      (listed.result?.tools ?? []).map((tool): [string, ServedTool] => [tool.name, tool])
    );
    const expected = new Set(manifest.tools.map((tool) => tool.name));
    const missing = [...expected].filter((name) => !served.has(name));
    const extra = [...served.keys()].filter((name) => !expected.has(name));
    lines.push(`Server lists ${served.size} tool(s); the manifest expects ${expected.size}.`);
    if (missing.length > 0) return fail(`Missing from the server: ${missing.join(", ")}`);
    if (extra.length > 0) return fail(`Not in the manifest: ${extra.join(", ")}`);
    for (const tool of manifest.tools) {
      const readOnly = served.get(tool.name)?.annotations?.readOnlyHint === true;
      if (readOnly !== (tool.access === "read")) return fail(`${tool.name} is annotated differently from the manifest`);
      lines.push(`ok  ${tool.name} (${tool.access})`);
    }

    if (options.call) {
      const target = manifest.tools.find((tool) => tool.name === options.call?.tool);
      if (!target) return fail(`${options.call.tool} is not a tool in the manifest`);
      if (target.access !== "read" && !options.allowWrite) {
        return fail(`${target.name} is a ${target.access} tool and would change data. Pass --allow-write to call it.`);
      }
      const called = await rpc(url, "tools/call", { name: target.name, arguments: options.call.args }, headers);
      const result = called.result;
      if (called.error || result?.isError) return fail(`${target.name}: ${called.error?.message ?? result?.content?.[0]?.text}`);
      lines.push(`ok  ${target.name} returned:`, String(result?.content?.[0]?.text ?? "").slice(0, 2000));
    }
    return { ok: true, lines };
  } finally {
    await new Promise<void>((resolve) => app.close(() => resolve()));
  }
}
