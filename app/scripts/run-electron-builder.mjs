import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const require = createRequire(import.meta.url);
const electronBuilderCli = require.resolve("electron-builder/out/cli/cli.js");
const forwardedArgs = process.argv.slice(2);

if (forwardedArgs[0] === "--") {
  forwardedArgs.shift();
}

const builderArgs = [
  electronBuilderCli,
  "--config",
  "electron-builder.yml",
  "--publish",
  "never",
  ...forwardedArgs
];

const child = spawn(process.execPath, builderArgs, {
  cwd: appRoot,
  stdio: "inherit"
});

child.on("error", (error) => {
  console.error("无法启动 electron-builder:", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
