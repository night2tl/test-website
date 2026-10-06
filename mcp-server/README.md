# MCP Server

A standalone [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that exposes selected API endpoints from the test-website application to AI agents.

## Tools

| Tool | Endpoint | Access | Sensitivity |
| --- | --- | --- | --- |
| `get_product` | `GET /api/products/:id` | read | none |
| `list_products` | `GET /api/products` | read | none |
| `search_products` | `GET /api/search` | read | none |

## Authentication

**Auth mode: `none`**

Every selected endpoint is public, so the server sends no credential.

To change the auth mode, set the `AUTH_MODE` environment variable:

- `none` (default) — no credential is sent with API requests.
- `passthrough` — the MCP server forwards the caller's `Authorization` header to the API. Requires `AUTH_ISSUER` and `MCP_PUBLIC_URL`.
- `service-token` — the MCP server attaches a fixed token from `API_AUTH_TOKEN` to every API request.

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `API_BASE_URL` | Yes | — | Base URL of the upstream API (e.g. `http://localhost:4000`). |
| `AUTH_MODE` | No | `none` | Authentication mode: `none`, `passthrough`, or `service-token`. |
| `API_AUTH_TOKEN` | When `service-token` or stdio `passthrough` | — | Static bearer token sent with API requests. |
| `API_AUTH_HEADER` | No | `authorization` | HTTP header name used to send the credential. |
| `API_AUTH_SCHEME` | No | `Bearer` | Scheme prefix for the credential (set to empty string to send the raw token). |
| `AUTH_ISSUER` | When `passthrough` over HTTP | — | OAuth issuer URL advertised in the protected-resource metadata. |
| `MCP_PUBLIC_URL` | When `passthrough` over HTTP | — | Public URL of this MCP server (for the OAuth resource metadata endpoint). |
| `PORT` | No | `3000` | Port the HTTP server listens on. |

## Getting started

```bash
cd mcp-server
npm install
npm run build
```

### Run over HTTP (for remote clients)

```bash
API_BASE_URL=http://localhost:4000 npm start
```

The server listens on `http://localhost:3000/mcp` by default.

### Run over stdio (for local clients)

```bash
API_BASE_URL=http://localhost:4000 npm run start:stdio
```

### Connect a client

- **MCP Inspector**: `npx @modelcontextprotocol/inspector` and point it at `http://localhost:3000/mcp`.
- **Any MCP client**: add `http://localhost:3000/mcp` as a connector URL.

## Verify it works

1. **Unit and contract tests**

   ```bash
   npm test
   ```

   Compiles the package and runs the test suite. The tests check that the server registers exactly the tools listed in `tools.manifest.json` and that each tool calls its documented HTTP method and route with the documented parameters. The tests use a fake API client, so they prove the wiring is correct — not that the real API behaves as documented.

2. **Smoke test (tool listing)**

   ```bash
   npm run smoke
   ```

   Starts the server in-process and checks that it lists the same tools as the manifest.

3. **Smoke test (real call)**

   Point `API_BASE_URL` at a real or staging API and make one real read-only call:

   ```bash
   API_BASE_URL=REPLACE_ME npm run smoke -- --call list_products '{}'
   ```

   Only read tools can be called without `--allow-write`. If the server expects a caller token, add `--token <token>` or set `SMOKE_TOKEN`.

4. **Try it from a client**

   Start the server with `npm start`, then point the MCP Inspector (`npx @modelcontextprotocol/inspector`) at `http://localhost:3000/mcp`, or add that URL as a connector in an MCP client.
