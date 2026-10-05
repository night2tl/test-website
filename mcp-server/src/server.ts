import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolConfig } from "./tools/list-products.js";
import { register as registerListProducts } from "./tools/list-products.js";
import { register as registerGetProduct } from "./tools/get-product.js";
import { register as registerSearchProducts } from "./tools/search-products.js";
import { register as registerGetOrder } from "./tools/get-order.js";

export function createServer(config: ToolConfig): McpServer {
  const server = new McpServer({
    name: "test-website-mcp-server",
    version: "1.0.0",
  });

  registerListProducts(server, config);
  registerGetProduct(server, config);
  registerSearchProducts(server, config);
  registerGetOrder(server, config);

  return server;
}
