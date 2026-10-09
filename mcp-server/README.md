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

The default auth mode is **`service-token`**: the server holds one API credential in `API_AUTH_TOKEN` and uses it for every caller. All callers share that identity.

If your API accepts per-user bearer tokens, set `AUTH_MODE=passthrough` for a safer setup where each caller sends their own token and the server forwards it.

Over HTTP the server refuses to start unless `MCP_INBOUND_TOKEN` is set — a shared secret (at least 16 characters) every client must send as `Authorization: Bearer <token>` to `/mcp`, otherwise the server answers 401. Set `MCP_ALLOW_UNAUTHENTICATED=true` to explicitly opt in to running without it (this lets anyone who can reach the server use the shared API credential).

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `API_BASE_URL` | **yes** | — | Base URL of the upstream API (e.g. `http://localhost:4000`) |
| `AUTH_MODE` | no | `service-token` | `service-token`, `passthrough`, or `none` |
| `API_AUTH_TOKEN` | yes (service-token) | — | Credential sent to the API on every request |
| `API_AUTH_HEADER` | no | `authorization` | Header name for the API credential |
| `API_AUTH_SCHEME` | no | `Bearer` | Scheme prefix for the credential (set empty for raw token) |
| `API_HEADER_X_API_KEY` | **yes** | — | Value for the `x-api-key` header sent with every API request (API key for authentication) |
| `MCP_INBOUND_TOKEN` | yes (HTTP) | — | Shared secret clients must send as `Authorization: Bearer <token>` to `/mcp` |
| `MCP_ALLOW_UNAUTHENTICATED` | no | `false` | Set to `true` to run without `MCP_INBOUND_TOKEN` |
| `AUTH_ISSUER` | yes (passthrough) | — | OAuth issuer URL for RFC 9728 discovery |
| `MCP_PUBLIC_URL` | yes (passthrough) | — | Public URL of this server for OAuth metadata |
| `PORT` | no | `3000` | HTTP listen port |

## Getting started

```bash
cd mcp-server
npm install
npm run build
```

### HTTP transport (default)

```bash
# Set environment variables (copy .env.example to .env and fill in values)
npm start
```

The server listens on `http://localhost:3000/mcp` (POST).

### stdio transport (local client)

```bash
npm run start:stdio
```

## Connecting a client

- **MCP Inspector**: `npx @modelcontextprotocol/inspector` and point it at `http://localhost:3000/mcp`.
- **Any MCP client**: add `http://localhost:3000/mcp` as a connector URL. If `MCP_INBOUND_TOKEN` is set, the client must send `Authorization: Bearer <token>` with every request.

## Verify it works

### 1. Run the tests

```bash
npm test
```

This compiles the package and runs the guardrail and contract tests. The tests check that the server registers exactly the tools in `tools.manifest.json` and that each tool calls its documented method and route with the documented parameters. The tests use a fake API, so they prove the wiring — not that the real API behaves as documented.

### 2. Smoke test

```bash
npm run smoke
```

Starts the server in-process and checks that it lists the same tools as the manifest.

### 3. Call a tool against a real API

With `API_BASE_URL` pointing at a real or staging API:

```bash
npm run smoke -- --call list_products '{}'
```

Only read tools can be called without `--allow-write`. If the server expects a caller token, add `--token <token>` or set `SMOKE_TOKEN`.

### 4. Try it from a client

Start the server:

```bash
npm start
```

Then connect the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
```

Point it at `http://localhost:3000/mcp`, or add that URL as a connector in any MCP client.
