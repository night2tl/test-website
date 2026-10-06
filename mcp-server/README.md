# MCP Server

A standalone [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that exposes 3 product-catalog API endpoints to AI agents.

## Tools

| Tool | Endpoint | Access | Sensitivity |
| --- | --- | --- | --- |
| `list_products` | `GET /api/products` | read | none |
| `get_product` | `GET /api/products/:id` | read | none |
| `search_products` | `GET /api/search` | read | none |

## Authentication

The server's default auth mode is **`none`** — every selected endpoint is public, so the server sends no credential.

To switch auth modes, set the `AUTH_MODE` environment variable:

| Mode | Description |
| --- | --- |
| `none` (default) | No credential is sent with API requests. |
| `service-token` | A fixed token from `API_AUTH_TOKEN` is sent with every request. |
| `passthrough` | Over HTTP, the caller's `Authorization` header is forwarded. Over stdio, falls back to `API_AUTH_TOKEN`. |

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `API_BASE_URL` | **Yes** | — | Base URL of the upstream API (e.g. `http://localhost:4000`). |
| `AUTH_MODE` | No | `none` | Authentication mode: `none`, `service-token`, or `passthrough`. |
| `API_AUTH_TOKEN` | When mode needs it | — | Static bearer token for `service-token` mode (or `passthrough` over stdio). |
| `API_AUTH_HEADER` | No | `authorization` | HTTP header name used to send the credential. |
| `API_AUTH_SCHEME` | No | `Bearer` | Scheme prefix for the token (set to empty string to send the raw token). |
| `AUTH_ISSUER` | When `passthrough` over HTTP | — | OAuth issuer URL advertised in the protected-resource metadata. |
| `MCP_PUBLIC_URL` | When `passthrough` over HTTP | — | Public URL of this MCP server (used in the OAuth metadata). |
| `PORT` | No | `3000` | Port the HTTP server listens on. |

## Getting started

```bash
cd mcp-server
npm install
npm run build
```

### Run over HTTP (for remote MCP clients)

```bash
API_BASE_URL=http://localhost:4000 npm start
```

The server listens on `http://localhost:3000/mcp` by default.

### Run over stdio (for local MCP clients)

```bash
API_BASE_URL=http://localhost:4000 npm run start:stdio
```

### Connect a client

- **MCP Inspector:** `npx @modelcontextprotocol/inspector` and point it at `http://localhost:3000/mcp`.
- **Any MCP client:** add `http://localhost:3000/mcp` as a connector URL.

## Verify it works

1. **Unit and contract tests:**

   ```bash
   npm test
   ```

   This compiles the package and runs the guardrail and contract tests. The tests check that the server registers exactly the tools listed in `tools.manifest.json` and that each tool calls its documented HTTP method and route with the documented parameters. The tests use a fake API client, so they prove the wiring is correct — not that the real API behaves as documented.

2. **Smoke test (tool listing):**

   ```bash
   API_BASE_URL=http://localhost:4000 npm run smoke
   ```

   Starts the server in-process and checks that it lists the same tools as the manifest.

3. **Smoke test (real call):**

   With `API_BASE_URL` pointing at a real or staging API:

   ```bash
   API_BASE_URL=REPLACE_ME npm run smoke -- --call list_products '{}'
   ```

   This makes one real read-only API call. Only read tools can be called without `--allow-write`. If the server expects a caller token, add `--token <token>` or set `SMOKE_TOKEN`.

4. **Try it from a client:**

   Start the server with `npm start`, then either point the MCP Inspector (`npx @modelcontextprotocol/inspector`) at `http://localhost:3000/mcp`, or add that URL as a connector in an MCP client.
