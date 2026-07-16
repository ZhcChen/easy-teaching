# Web App 模块

当前模块定位：

- 面向 `PC + H5` 的主 Web 前端模块
- 技术栈采用 `React + PixiJS + Three.js`
- 当前阶段先保留模块骨架
- 后续确定具体技术栈后，再用最新官方脚手架初始化正式工程

## 当前目录

```text
web-app/
├─public/
└─src/
  ├─assets/
  ├─components/
  ├─engines/
  │ ├─pixi/
  │ └─three/
  ├─layouts/
  ├─pages/
  ├─store/
  ├─styles/
  └─utils/
```

## 当前约定

- 本地开发端口预留为 `57001`
- 第三方库不使用 CDN，引入方式统一走项目本地依赖
- 先不手工伪造具体框架模板
- UI 与交互方案先在 `ui-design-preview/` 中推进
- 正式实现前，优先复用：
  - `docs/plans/Web-App-模块规划.md`
  - `docs/plans/小程序信息架构与本地优先同步方案.md`
  - `shared-assets/`

## 后续动作

1. 确认 Web 技术栈
2. 使用 React 最新官方方式初始化工程
3. 接入本地依赖版 `PixiJS` 和 `Three.js`
4. 按已确认的 UI 和信息架构落正式页面
