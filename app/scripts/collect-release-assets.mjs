import { copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const defaultSourceDir = path.join(appRoot, "release");
const defaultTargetDir = path.resolve(appRoot, "..", ".artifacts", "release-assets");
const packageJsonPath = path.join(appRoot, "package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const currentVersion = String(packageJson.version);
const supportedExtensions = new Set([
  ".appimage",
  ".deb",
  ".dmg",
  ".exe",
  ".zip"
]);

async function collectAssetFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectAssetFiles(entryPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!supportedExtensions.has(extension)) {
      continue;
    }

    const normalizedName = entry.name.toLowerCase();
    if (!normalizedName.includes(`-${currentVersion.toLowerCase()}-`)) {
      continue;
    }

    if (
      !normalizedName.includes("-mac-") &&
      !normalizedName.includes("-win-") &&
      !normalizedName.includes("-linux-")
    ) {
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

const sourceDir = path.resolve(process.argv[2] ?? defaultSourceDir);
const targetDir = path.resolve(process.argv[3] ?? defaultTargetDir);
const assetFiles = await collectAssetFiles(sourceDir);

if (!assetFiles.length) {
  throw new Error(`未在 ${sourceDir} 找到发布产物。`);
}

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });

for (const assetFile of assetFiles) {
  const targetPath = path.join(targetDir, path.basename(assetFile));
  await copyFile(assetFile, targetPath);
}

console.log(`已收集 ${assetFiles.length} 个发布产物到 ${targetDir}`);
