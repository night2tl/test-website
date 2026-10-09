# MCP Server

A standalone [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that exposes selected API endpoints from the test-website application to AI agents.

## Tools

| Tool | Endpoint | Access | Sensitivity |
| --- | --- | --- | --- |
| `list_products` | GET /api/products | read | none |
| `get_product` | GET /api/products/:id | read | none |
| `search_products` | GET /api/search | read | none |

## Authentication

The default auth mode is **`none`**: every selected endpoint is public, so the server sends no credential to the upstream API.

When running over HTTP the server still protects its own `/mcp` endpoint. Set **`MCP_INBOUND_TOKEN`** (a shared secret of at least 16 characters) so that callers must present it as `Authorization: Bearer <token>`. Alternatively, set **`MCP_ALLOW_UNAUTHENTICATED=true`** to knowingly serve the endpoint without authentication.

To switch auth modes, set `AUTH_MODE` to one of:

| Mode | Description |
| --- | --- |
| `none` (default) | No credential is sent to the upstream API. |
| `passthrough` | Over HTTP, each caller's `Authorization` header is forwarded to the API. Over stdio, falls back to `API_AUTH_TOKEN`. Requires `AUTH_ISSUER` and `MCP_PUBLIC_URL`. |
| `service-token` | A single `API_AUTH_TOKEN` is used for every request. |

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `API_BASE_URL` | Yes | Base URL of the upstream API (e.g. `http://localhost:4000`). |
| `AUTH_MODE` | No | One of `none`, `passthrough`, or `service-token`. Defaults to `none`. |
| `API_AUTH_TOKEN` | When `service-token` or stdio `passthrough` | Bearer token sent to the upstream API. |
| `API_AUTH_HEADER` | No | Header name for the credential. Defaults to `authorization`. |
| `API_AUTH_SCHEME` | No | Scheme prefix for the token (e.g. `Bearer`). Defaults to `Bearer`. Set to empty string to send the raw token. |
| `AUTH_ISSUER` | When `passthrough` over HTTP | OAuth issuer URL for caller token validation. |
| `MCP_PUBLIC_URL` | When `passthrough` over HTTP | Public URL of this server, used in OAuth resource metadata. |
| `MCP_INBOUND_TOKEN` | Recommended for HTTP | Shared secret (>= 16 chars) that HTTP callers must send as `Authorization: Bearer <token>`. |
| `MCP_ALLOW_UNAUTHENTICATED` | No | Set to `true` to allow unauthenticated HTTP access when no `MCP_INBOUND_TOKEN` is set. |
| `PORT` | No | HTTP listen port. Defaults to `3000`. |

## Getting started

```bash
cd mcp-server
npm install
npm run build
```

### Run over HTTP

```bash
export API_BASE_URL=http://localhost:4000
export MCP_INBOUND_TOKEN=my-secret-token-1234
npm start
```

The server listens on `http://localhost:3000/mcp`.

### Run over stdio

```bash
export API_BASE_URL=http://localhost:4000
npm run start:stdio
```

### Connect a client

- **MCP Inspector**: `npx @modelcontextprotocol/inspector` and point it at `http://localhost:3000/mcp`.
- **Any MCP client**: add `http://localhost:3000/mcp` as a connector URL.

## Verify it works

### 1. Run the tests

```bash
npm test
```

Compiles the package and checks that the server registers exactly the tools in `tools.manifest.json`, and that each tool calls its documented method and route with the documented parameters. It uses a fake API, so it proves the wiring and not that the real API behaves as documented.

### 2. Smoke test (tool listing)

```bash
API_BASE_URL=http://localhost:4000 npm run smoke
```

Starts the server and checks it lists the same tools as the manifest.

### 3. Smoke test (real call)

With `API_BASE_URL` pointing at a real or staging API:

```bash
API_BASE_URL=http://localhost:4000 npm run smoke -- --call list_products '{}'
```

Makes one real read-only call. Only read tools can be called without `--allow-write`. If the server expects a caller token, add `--token <token>` or set `SMOKE_TOKEN`.

### 4. Try it from a client

Start the server:

```bash
API_BASE_URL=http://localhost:4000 MCP_ALLOW_UNAUTHENTICATED=true npm start
```

Then connect the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
```

Point it at `http://localhost:3000/mcp`, or add that URL as a connector in an MCP client.
