---
title: refactor: migrate app desktop host from tauri to electron
type: refactor
status: completed
date: 2026-07-23
origin: direct-user-request-2026-07-23
---

# refactor: migrate app desktop host from tauri to electron

## Overview

将根目录 `app/` 模块从 `Tauri 2` 宿主切换为 `Electron` 宿主，整体技术组织参考 `~/code/App-Manager`，但继续保留当前仓库已经确认的核心约束：`web-app/` 是唯一前端业务源码，`app/` 只负责桌面宿主、打包和发布。

## Problem Frame

当前 `app/` 已经按 Tauri 宿主搭建完成，但用户最新决策是改成和 `App-Manager` 一样的 Electron 路线。这个调整不是只改一个依赖，而是要同时替换三层内容：

- 桌面运行时：`Tauri -> Electron`
- 桌面构建链：`tauri build -> electron-builder`
- 桌面 CI：`Tauri workflow -> Electron workflow`

同时仍需满足之前已经确认的同步目标：`web-app/` 和 `app/` 后续功能不能分叉，桌面端继续复用 `web-app/` 的前端业务实现。

## Requirements Trace

- R1. `app/` 宿主技术从 Tauri 改为 Electron。
- R2. 迁移后的结构尽量参考 `~/code/App-Manager/desktop`。
- R3. `web-app/` 继续作为唯一前端业务源码。
- R4. Electron 开发态直接加载 `web-app` 开发服务。
- R5. Electron 打包态继续消费 `web-app` 构建产物，而不是维护第二套页面源码。
- R6. `.github/workflows/release-app.yml` 改成 Electron Builder 发布链。
- R7. 保留当前版本校验、tag 发布和 GitHub Release 资产上传能力。

## Scope Boundaries

- 不在本轮新增桌面专属业务功能或 IPC 能力。
- 不把 `web-app/` 业务源码复制进 `app/renderer`。
- 不做自动更新、托盘、系统菜单、原生文件对话框等扩展。
- 不处理 macOS 正式公证；维持 ad-hoc 和 Windows 未签名分发策略。

## Key Technical Decisions

- **Electron 只负责桌面壳，不接管前端业务。**
  - 理由：用户之前已经明确要求 `app` 与 `web-app` 功能同步，继续保持单一前端源码是成本最低的路径。

- **开发态直接加载 `http://127.0.0.1:57001`。**
  - 理由：与当前 `web-app` 本地端口保持一致，不改现有前端开发习惯。

- **打包态不直接 `loadFile(web-app/build/client/index.html)`，而是由 Electron 主进程起一个本地静态服务再加载。**
  - 理由：当前 `web-app` 是 React Router SPA，多路由页面在 `file://` 协议下会出现路径匹配问题；用本地静态服务可以保持和 Web 一致的路由行为。

- **Workflow 组织参考 `App-Manager`，但依赖管理保持本仓库的 `npm`。**
  - 理由：用户要求参考结构，但当前仓库已实际使用 `npm + package-lock`，没必要顺带切换包管理器。

## Implementation Units

- [x] **Unit 1: 用 Electron 宿主替换 app/Tauri**

**Goal:** 将 `app/` 的运行时从 Tauri 切换到 Electron，并保留与 `web-app/` 的共享前端关系。

**Requirements:** R1, R2, R3, R4, R5

**Files:**
- Modify: `app/package.json`
- Modify: `app/README.md`
- Create: `app/tsconfig.electron.json`
- Create: `app/electron/main.cts`
- Create: `app/electron/preload.cts`
- Create: `app/electron-builder.yml`
- Create: `app/build/entitlements.mac.plist`
- Create: `app/build/entitlements.mac.inherit.plist`
- Create: `app/scripts/sync-web-build.mjs`
- Modify: `package.json`
- Delete: `app/src-tauri/Cargo.toml`
- Delete: `app/src-tauri/build.rs`
- Delete: `app/src-tauri/tauri.conf.json`
- Delete: `app/src-tauri/capabilities/default.json`
- Delete: `app/src-tauri/src/lib.rs`
- Delete: `app/src-tauri/src/main.rs`
- Delete: `app/src-tauri/Cargo.lock`

**Approach:**
- 使用 `App-Manager` 风格的 `electron/ + dist-electron + electron-builder.yml` 组织。
- 开发态通过 `ELECTRON_RENDERER_URL` 指向 `web-app` dev server。
- 打包态先构建 `web-app`，再把其静态产物同步到 `app/dist/`，由 Electron 主进程的本地静态服务承载。

**Verification:**
- `npm --prefix app run dev` 能拉起 Electron 窗口。
- `npm --prefix app run dist` 能输出 Electron 打包产物。

- [x] **Unit 2: 将 GitHub Actions 切换到 Electron Builder**

**Goal:** 让 `release-app.yml` 与 Electron 构建链对齐。

**Requirements:** R2, R6, R7

**Files:**
- Modify: `.github/workflows/release-app.yml`

**Approach:**
- 改成和 `App-Manager` 类似的矩阵结构：
  - tag 校验
  - 多平台构建
  - 收集产物
  - 发布 release
- 构建命令改为 `electron-builder`
- macOS 保持 ad-hoc：`CSC_IDENTITY_AUTO_DISCOVERY=false` + `identity: "-"`.

**Verification:**
- workflow 中不再包含 Tauri/Rust 专属步骤。
- release 产物路径与 Electron Builder 的输出目录一致。

- [x] **Unit 3: 更新规划与说明文档**

**Goal:** 把仓库内关于 `app/` 是 Tauri 的描述改为 Electron。

**Requirements:** R1, R2, R3

**Files:**
- Modify: `web-app/README.md`
- Modify: `docs/plans/Web-App-模块规划.md`
- Modify: `docs/plans/2026-07-23-003-feat-tauri-app-module-plan.md`

**Approach:**
- 把 `Tauri` 改为 `Electron`
- 保留“`web-app` 唯一前端源码”的结论
- 将旧 Tauri 计划标记为历史阶段方案

**Verification:**
- 仓库文档不再把 `app/` 描述成 Tauri 宿主。

## Risks and Mitigations

- **风险：React Router SPA 在 Electron file 协议下路由异常。**
  - 缓解：打包态使用本地静态服务，而不是直接 `loadFile`。

- **风险：Electron Builder 的图标/平台产物与当前 Tauri 目录不完全一致。**
  - 缓解：优先复用现有生成好的 `.icns/.ico` 图标资产，后续再整理图标目录。

- **风险：CI 切换时 release 路径变化导致上传失败。**
  - 缓解：增加独立的收集脚本，把 `release/` 中有效资产统一复制到临时目录后上传。
