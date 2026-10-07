import type { Config } from "./config.js";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ERROR_BODY_CHARS = 2_000;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string
  ) {
    super(`API responded with ${status}`);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export interface ApiClient {
  get(path: string, options?: RequestOptions): Promise<unknown>;
  post(path: string, options?: RequestOptions): Promise<unknown>;
  put(path: string, options?: RequestOptions): Promise<unknown>;
  patch(path: string, options?: RequestOptions): Promise<unknown>;
  delete(path: string, options?: RequestOptions): Promise<unknown>;
}

// `.` and `..` (also percent-encoded) would let a path parameter climb out of its route.
function assertNoDotSegments(path: string): void {
  const pathname = path.split(/[?#]/, 1)[0] ?? "";
  for (const raw of pathname.split(/[/\\]/)) {
    let segment = raw;
    try {
      segment = decodeURIComponent(raw);
    } catch {
      throw new Error(`API path has an invalid escape sequence: ${path}`);
    }
    if (segment === "." || segment === "..") {
      throw new Error(`API path must not contain "." or ".." segments: ${path}`);
    }
  }
}

// Tool code only ever supplies a path, so a request can never be steered to another host.
function buildUrl(baseUrl: string, path: string, query: RequestOptions["query"]): URL {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error(`API path must start with a single "/": ${path}`);
  }
  assertNoDotSegments(path);
  const url = new URL(baseUrl + path);
  if (url.origin !== new URL(baseUrl).origin) throw new Error(`API path left the API host: ${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

function credentialValue(config: Config, callerAuthorization: string | undefined): string | undefined {
  if (config.credential === "caller-header") return callerAuthorization;
  if (config.credential === "env-token" && config.token) {
    return config.authScheme ? `${config.authScheme} ${config.token}` : config.token;
  }
  return undefined;
}

export function createApiClient(config: Config, callerAuthorization?: string): ApiClient {
  async function send(method: string, path: string, options: RequestOptions = {}): Promise<unknown> {
    const headers: Record<string, string> = { accept: "application/json" };
    for (const { name, value } of config.staticHeaders) headers[name] = value;
    const credential = credentialValue(config, callerAuthorization);
    if (credential) headers[config.authHeader] = credential;

    let body: string | undefined;
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const response = await fetch(buildUrl(config.apiBaseUrl, path, options.query), {
      method,
      headers,
      body,
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    if (!response.ok) throw new ApiError(response.status, text.slice(0, MAX_ERROR_BODY_CHARS));
    if (text === "") return null;
    return response.headers.get("content-type")?.includes("json") ? JSON.parse(text) : text;
  }

  return {
    get: (path, options) => send("GET", path, options),
    post: (path, options) => send("POST", path, options),
    put: (path, options) => send("PUT", path, options),
    patch: (path, options) => send("PATCH", path, options),
    delete: (path, options) => send("DELETE", path, options),
  };
}
