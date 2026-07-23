import { execFile as execFileCallback } from "node:child_process";
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const releaseTag = process.env.RELEASE_TAG ?? process.argv[2];
const githubRepository = process.env.GITHUB_REPOSITORY ?? process.argv[3];
const assetsDir = path.resolve(process.argv[4] ?? path.join(".artifacts", "publish-assets"));
const outputPath = path.resolve(process.argv[5] ?? path.join(".artifacts", "release-notes.md"));

if (!releaseTag) {
  throw new Error("缺少发布标签，请提供 RELEASE_TAG 或 argv[2]。");
}

if (!githubRepository) {
  throw new Error("缺少 GitHub 仓库，请提供 GITHUB_REPOSITORY 或 argv[3]。");
}

const releaseBaseUrl = `https://github.com/${githubRepository}/releases/download/${releaseTag}`;

const platformOrder = ["macOS", "Windows", "Linux"];
const archOrder = ["arm64", "x64"];
const formatOrder = ["dmg", "exe", "appimage", "deb", "zip"];

const formatLabels = {
  appimage: "AppImage",
  deb: "DEB",
  dmg: "DMG",
  exe: "EXE 安装器",
  zip: "ZIP"
};

function detectPlatform(fileName) {
  if (fileName.includes("-mac-")) {
    return "macOS";
  }

  if (fileName.includes("-win-")) {
    return "Windows";
  }

  if (fileName.includes("-linux-")) {
    return "Linux";
  }

  return null;
}

function detectArch(fileName) {
  if (fileName.includes("-arm64.")) {
    return "arm64";
  }

  if (
    fileName.includes("-x64.") ||
    fileName.includes("-amd64.") ||
    fileName.includes("-x86_64.")
  ) {
    return "x64";
  }

  if (fileName.includes("-aarch64.")) {
    return "arm64";
  }

  return null;
}

function detectFormat(fileName) {
  if (fileName.endsWith(".appimage")) {
    return "appimage";
  }

  if (fileName.endsWith(".deb")) {
    return "deb";
  }

  if (fileName.endsWith(".dmg")) {
    return "dmg";
  }

  if (fileName.endsWith(".exe")) {
    return "exe";
  }

  if (fileName.endsWith(".zip")) {
    return "zip";
  }

  return null;
}

async function findPreviousTag(currentTag) {
  try {
    const { stdout } = await execFile("git", [
      "tag",
      "--list",
      "v*.*.*",
      "--sort=-version:refname"
    ]);
    const tags = stdout
      .split("\n")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const currentIndex = tags.indexOf(currentTag);
    if (currentIndex === -1) {
      return null;
    }

    return tags[currentIndex + 1] ?? null;
  } catch {
    return null;
  }
}

const assetNames = (await readdir(assetsDir))
  .filter((entry) => !entry.startsWith("."))
  .sort((left, right) => left.localeCompare(right));

const groupedAssets = new Map();

for (const assetName of assetNames) {
  const normalizedName = assetName.toLowerCase();
  const platform = detectPlatform(normalizedName);
  const arch = detectArch(normalizedName);
  const format = detectFormat(normalizedName);

  if (!platform || !arch || !format) {
    continue;
  }

  const platformGroup = groupedAssets.get(platform) ?? new Map();
  const archGroup = platformGroup.get(arch) ?? [];
  archGroup.push({
    format,
    name: assetName,
    url: `${releaseBaseUrl}/${encodeURIComponent(assetName)}`
  });
  platformGroup.set(arch, archGroup);
  groupedAssets.set(platform, platformGroup);
}

const lines = [
  "## 下载",
  "",
  "> 当前桌面端前端来源：`web-app`",
  "> ",
  "> 桌面宿主：`Electron app`",
  ""
];

for (const platform of platformOrder) {
  const platformGroup = groupedAssets.get(platform);
  if (!platformGroup) {
    continue;
  }

  lines.push(`### ${platform}`);

  for (const arch of archOrder) {
    const archAssets = platformGroup.get(arch);
    if (!archAssets?.length) {
      continue;
    }

    lines.push(`- ${arch}`);

    archAssets
      .sort((left, right) => {
        const leftOrder = formatOrder.indexOf(left.format);
        const rightOrder = formatOrder.indexOf(right.format);
        return leftOrder - rightOrder;
      })
      .forEach((asset) => {
        lines.push(`  - [${formatLabels[asset.format]}](${asset.url})`);
      });
  }

  lines.push("");
}

const previousTag = await findPreviousTag(releaseTag);

if (previousTag) {
  lines.push("## 变更");
  lines.push("");
  lines.push(
    `- [查看完整变更](https://github.com/${githubRepository}/compare/${previousTag}...${releaseTag})`
  );
  lines.push("");
}

await writeFile(outputPath, `${lines.join("\n").trim()}\n`, "utf8");
console.log(`已生成发布说明：${outputPath}`);
