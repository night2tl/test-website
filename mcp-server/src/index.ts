import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createApiClient } from "./api-client.js";
import { ConfigError, loadConfig } from "./config.js";
import { createHttpApp } from "./http.js";
import { createServer } from "./server.js";

const stdio = process.argv.includes("--stdio");

try {
  const config = loadConfig(process.env, stdio ? "stdio" : "http");

  if (stdio) {
    await createServer(createApiClient(config)).connect(new StdioServerTransport());
  } else {
    if (config.credential === "env-token") {
      console.error("WARNING: every caller shares the credential in API_AUTH_TOKEN. Prefer AUTH_MODE=passthrough.");
    }
    if (config.credential !== "caller-header" && !config.inboundToken) {
      console.error("WARNING: MCP_ALLOW_UNAUTHENTICATED=true: anyone who can reach /mcp can use the API credential.");
    }
    createHttpApp(config).listen(config.port, () => {
      console.error(`MCP server listening on port ${config.port}`);
    });
  }
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
