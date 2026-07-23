import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const sourceDir = path.resolve(appRoot, "../web-app/build/client");
const targetDir = path.join(appRoot, "dist");

try {
  await access(sourceDir);
} catch {
  throw new Error(`未找到 web-app 构建产物：${sourceDir}`);
}

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });

console.log(`已同步 web-app 构建产物到 ${targetDir}`);
