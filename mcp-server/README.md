# MCP Server

A standalone [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that exposes selected API endpoints from the test-website application to AI agents.

## Tools

| Tool | Endpoint | Access | Sensitivity |
| --- | --- | --- | --- |
| `list_products` | GET /api/products | read | none |
| `get_product` | GET /api/products/:id | read | none |
| `search_products` | GET /api/search | read | none |
| `get_order` | GET /api/orders/:id | read | none |

## Authentication

The default auth mode is **`service-token`**. All callers share one credential: the server reads `API_AUTH_TOKEN` from the environment and sends it on every request to the upstream API. Because the API authenticates with an `x-api-key` header (not a per-user bearer token), the header and scheme are configured accordingly.

If your API can accept per-user bearer tokens, switch to `AUTH_MODE=passthrough` for better security — each caller then forwards their own token instead of sharing one.

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `API_BASE_URL` | **yes** | — | Base URL of the upstream API (e.g. `http://localhost:4000`). |
| `AUTH_MODE` | no | `service-token` | One of `service-token`, `passthrough`, or `none`. |
| `API_AUTH_TOKEN` | **yes** (when `service-token` or stdio `passthrough`) | — | The credential sent to the API. |
| `API_AUTH_HEADER` | no | `authorization` | HTTP header name used for the credential. Set to `x-api-key` for this API. |
| `API_AUTH_SCHEME` | no | `Bearer` | Scheme prefix before the token. Set to empty string for a raw `x-api-key` value. |
| `API_HEADER_X_API_KEY` | **yes** (unless `API_AUTH_HEADER=x-api-key`) | — | Value for the `x-api-key` header. When `API_AUTH_HEADER` is already `x-api-key`, the auth system owns that header and this variable is not needed. |
| `AUTH_ISSUER` | only for `passthrough` over HTTP | — | OAuth issuer URL for caller token validation. |
| `MCP_PUBLIC_URL` | only for `passthrough` over HTTP | — | Public URL of this MCP server (for OAuth resource metadata). |
| `PORT` | no | `3000` | HTTP listen port. |

## Getting started

```bash
cd mcp-server
npm install
npm run build
```

### Run over HTTP (for remote clients)

```bash
npm start
```

The server listens on `http://localhost:3000/mcp` (or the configured `PORT`).

### Run over stdio (for local clients)

```bash
npm run start:stdio
```

The server communicates via stdin/stdout, which local MCP clients (e.g. Claude Desktop) use directly.

### Connecting a client

- **MCP Inspector**: `npx @modelcontextprotocol/inspector` and point it at `http://localhost:3000/mcp`.
- **Any MCP client**: add `http://localhost:3000/mcp` as a Streamable HTTP connector, or configure the stdio command (`node dist/src/index.js --stdio`) for local use.

## Verify it works

1. **Unit and contract tests** — compile and run the test suite:

   ```bash
   npm test
   ```

   This checks that the server registers exactly the tools in `tools.manifest.json` and that each tool calls its documented HTTP method and route with the documented parameters. It uses a fake API client, so it proves the wiring is correct — not that the real API behaves as documented.

2. **Smoke test** — start the server in-process and verify the tool list:

   ```bash
   npm run smoke
   ```

3. **Live call** — with `API_BASE_URL` pointing at a real or staging API, make one real read-only call:

   ```bash
   npm run smoke -- --call list_products '{}'
   ```

   Only read tools can be called without `--allow-write`. If the server expects a caller token, add `--token <token>` or set `SMOKE_TOKEN`.

4. **Try it from a client** — start the server with `npm start`, then either point the MCP Inspector (`npx @modelcontextprotocol/inspector`) at `http://localhost:3000/mcp`, or add that URL as a connector in an MCP client.
