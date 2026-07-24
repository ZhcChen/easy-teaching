import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webAppRoot = path.resolve(__dirname, "..");
const serverBuildDir = path.join(webAppRoot, "build", "server");

if (fs.existsSync(serverBuildDir)) {
  fs.rmSync(serverBuildDir, { recursive: true, force: true });
  console.log("Removed build/server. Static assets are available in build/client.");
} else {
  console.log("No build/server directory found. Static assets are available in build/client.");
}
