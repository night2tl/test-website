# test-website MCP Server

A standalone [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that exposes selected API endpoints from the test-website API to AI agents.

## Tools

| Tool | Endpoint | Access | Sensitivity |
| --- | --- | --- | --- |
| `list_products` | `GET /api/products` | read | none |
| `get_product` | `GET /api/products/:id` | read | none |
| `search_products` | `GET /api/search` | read | none |
| `get_order` | `GET /api/orders/:id` | read | none |

### list_products

List all products in the catalog, optionally filtered by category.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `category` | string | no | Filter by category (e.g. `"plans"`, `"services"`). Omit to return all. |

### get_product

Retrieve a single product by its ID.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | The product ID (e.g. `"p1"`). |

### search_products

Search products by name substring.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `q` | string | no | Case-insensitive search term. Omit to return all. |

### get_order

Retrieve a single order by its ID (requires authentication).

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | The order ID (e.g. `"o1"`). |

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `API_BASE_URL` | **yes** | Base URL of the API server (e.g. `http://localhost:4000`). |
| `API_AUTH_TOKEN` | no | API key sent as `x-api-key` header for authenticated endpoints (`get_order`). |
| `PORT` | no | HTTP port for Streamable HTTP transport (default: `3000`). |

## Getting Started

### Install and build

```bash
cd mcp-server
npm install
npm run build
```

### Run with Streamable HTTP (default)

```bash
API_BASE_URL=http://localhost:4000 npm start
```

The server listens at `http://localhost:3000/mcp`.

### Run with stdio

```bash
API_BASE_URL=http://localhost:4000 npm run start:stdio
```

### Connect a client

#### Claude Desktop / Cursor (stdio)

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "test-website": {
      "command": "node",
      "args": ["<path-to>/mcp-server/dist/index.js", "--stdio"],
      "env": {
        "API_BASE_URL": "http://localhost:4000",
        "API_AUTH_TOKEN": "your-api-key"
      }
    }
  }
}
```

#### Streamable HTTP

Point your MCP client at `http://localhost:3000/mcp`.
