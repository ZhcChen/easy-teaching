# app

桌面端宿主模块，基于 `Tauri 2`。

## 模块定位

- `web-app/`：唯一前端业务源码来源
- `app/`：桌面端宿主层，负责窗口、打包、原生运行时

也就是说：

- Web 端页面继续在 `web-app/` 开发
- 桌面端通过 Tauri 直接加载 `web-app/` 的开发服务和构建产物

这样后续 `web-app/` 与 `app/` 的功能同步由结构保证，而不是双份页面代码手工同步。

## 常用命令

```bash
npm install
npm run dev
npm run check
npm run build
```

## 开发说明

- `npm run dev` 会启动 Tauri
- Tauri 会通过 `beforeDevCommand` 自动拉起 `web-app/` 的开发服务
- 默认复用 `http://127.0.0.1:57001`

## 构建说明

- `npm run build` 会先构建 `web-app/`
- 再由 Tauri 读取 `web-app/build/client` 生成桌面包
