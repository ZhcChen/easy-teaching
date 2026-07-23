import fs from "node:fs";
import path from "node:path";

const releaseTag = process.env.RELEASE_TAG;

if (!releaseTag) {
  console.error("缺少 RELEASE_TAG 环境变量");
  process.exit(1);
}

const normalizedTag = releaseTag.startsWith("v") ? releaseTag.slice(1) : releaseTag;
const packageJsonPath = path.resolve("package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

if (normalizedTag !== packageJson.version) {
  console.error(`发布标签 ${releaseTag} 与 app 版本 ${packageJson.version} 不一致`);
  process.exit(1);
}

console.log(`发布标签校验通过: ${releaseTag}`);
