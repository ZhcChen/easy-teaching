# web-app

可视化教学当前主 Web 前端模块。

## 模块定位

- 当前主路线：Web App
- 覆盖终端：PC + H5
- 技术基座：React Router 8、React 19、TypeScript、Tailwind CSS 4
- 本地开发端口：`57001`
- 桌面端宿主由根目录 `app/` 模块承接，直接复用本模块的开发服务与构建产物

## 当前范围

这一轮先完成正式工程初始化与一级路由基座：

- 首页
- 内容
- 学习
- 我的

可视化引擎能力已经确定为：

- `PixiJS`：后续承接 2D 可视化
- `Three.js`：后续承接 3D 可视化

当前尚未在本模块内正式接入这两个引擎，等具体场景页面进入开发时再落地。

## 与桌面端的关系

- `web-app/` 是唯一前端业务源码来源
- `app/` 是 Electron 桌面宿主层
- 桌面端开发时，Electron 会直接加载本模块的 `57001` 开发服务
- 桌面端构建时，会先读取本模块的 `build/client`，再同步到 `app/dist/` 供 Electron 本地静态服务加载

因此后续 `web-app/` 与 `app/` 的功能同步，是通过“共享同一套前端源码”实现的，不再维护双份页面代码。

## 启动方式

先安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

默认访问：

```text
http://127.0.0.1:57001
```

## 常用命令

```bash
npm run dev
npm run build
npm run typecheck
```

其中：

- `npm run build`：构建后只保留纯静态产物，部署目录为 `build/client`
- `build/server` 若被 React Router 在构建过程中临时生成，会在构建结束后自动清理

## 目录说明

```text
web-app/
├─app/
│ ├─root.tsx
│ ├─routes.ts
│ └─routes/
├─public/
├─package.json
└─vite.config.ts
```

说明：

- `app/root.tsx`：应用壳子与全局导航
- `app/routes.ts`：一级路由注册
- `app/routes/`：页面路由模块

## 相关文档

- `docs/plans/Web-App-模块规划.md`
- `docs/plans/小程序信息架构与本地优先同步方案.md`
