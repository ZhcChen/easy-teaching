import fs from "node:fs";
import path from "node:path";

const releaseTag = process.env.RELEASE_TAG;

if (!releaseTag) {
  console.error("缺少 RELEASE_TAG 环境变量");
  process.exit(1);
}

const normalizedTag = releaseTag.startsWith("v") ? releaseTag.slice(1) : releaseTag;
const packageJsonPath = path.resolve("package.json");
const tauriConfigPath = path.resolve("src-tauri/tauri.conf.json");
const cargoTomlPath = path.resolve("src-tauri/Cargo.toml");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, "utf8"));
const cargoToml = fs.readFileSync(cargoTomlPath, "utf8");
const cargoVersionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);

if (!cargoVersionMatch) {
  console.error("无法从 Cargo.toml 解析版本号");
  process.exit(1);
}

const versions = {
  packageJson: packageJson.version,
  tauriConfig: tauriConfig.version,
  cargoToml: cargoVersionMatch[1],
};

const uniqueVersions = new Set(Object.values(versions));

if (uniqueVersions.size !== 1) {
  console.error("app 模块版本不一致:", versions);
  process.exit(1);
}

if (normalizedTag !== packageJson.version) {
  console.error(`发布标签 ${releaseTag} 与 app 版本 ${packageJson.version} 不一致`);
  process.exit(1);
}

console.log(`发布标签校验通过: ${releaseTag}`);
