# app

桌面端宿主模块，基于 `Electron`。

## 模块定位

- `web-app/`：唯一前端业务源码来源
- `app/`：桌面端宿主层，负责窗口、打包、本地静态服务与发布

也就是说：

- Web 端页面继续在 `web-app/` 开发
- 桌面端通过 Electron 直接加载 `web-app/` 的开发服务和构建产物

这样后续 `web-app/` 与 `app/` 的功能同步由结构保证，而不是双份页面代码手工同步。

## 常用命令

```bash
npm install
npm run dev
npm run check
npm run build
npm run dist
```

## 开发说明

- `npm run dev` 会同时启动：
  - `web-app` 开发服务
  - Electron 主进程 / preload 的 TypeScript watch
  - Electron 窗口
- 默认复用 `http://127.0.0.1:57001`

## 构建说明

- `npm run build` 会先构建 `web-app/`
- 然后把 `web-app/build/client` 同步到 `app/dist/`
- 再编译 Electron 主进程代码到 `app/dist-electron/`
- `npm run dist` 会在当前平台生成桌面安装包，输出到 `app/release/`

## 运行时说明

- 开发态：Electron 直接加载 `http://127.0.0.1:57001`
- 打包态：Electron 会在本地起一个静态服务，再加载 `app/dist/`
- 这样可以保持 React Router SPA 在桌面端和浏览器端一致的路由行为
