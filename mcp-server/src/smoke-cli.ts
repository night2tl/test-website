import { ConfigError } from "./config.js";
import { runSmoke } from "./smoke.js";

function parseArgs(argv: string[]) {
  const callIndex = argv.indexOf("--call");
  const tokenIndex = argv.indexOf("--token");
  return {
    token: (tokenIndex >= 0 ? argv[tokenIndex + 1] : undefined) ?? process.env.SMOKE_TOKEN,
    allowWrite: argv.includes("--allow-write"),
    call:
      callIndex >= 0
        ? { tool: argv[callIndex + 1] ?? "", args: JSON.parse(argv[callIndex + 2] ?? "{}") as unknown }
        : undefined,
  };
}

try {
  const result = await runSmoke({ env: process.env, ...parseArgs(process.argv.slice(2)) });
  console.log(result.lines.join("\n"));
  process.exit(result.ok ? 0 : 1);
} catch (error) {
  console.error(error instanceof ConfigError ? error.message : error);
  process.exit(1);
}
