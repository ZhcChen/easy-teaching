# 品牌资源

共享品牌资源目录。

定位上与 `~/code/App-Manager/packages/brand/` 一致：把需要跨端复用的主 logo、图形标与导出稿集中维护，不把品牌资源绑死在某个具体业务模块下。

当前建议把以下资源统一放在这里：

- `logo/`：主 logo、图形标、稳定导出版本
- `fonts/`：后续若引入统一品牌字体，再继续补充
- `styles/`：后续若抽品牌色板 / token，再继续补充

当前主消费模块：

- `web-app/`
- `app/`

## 当前目录

- `logo/logo-mark.svg`：图形标源稿
- `logo/logo-mark-144.png`：透明背景 144 导出稿
- `logo/logo-mark-512.png`：透明背景 512 导出稿
- `logo/logo-horizontal.svg`：横版 logo 源稿
- `logo/logo-monochrome.svg`：单色版 logo

## 首版方向

- 关键词：简约、理性、可视化、可扩展
- 语义：打开的书页 + 中央知识主轴，避免只绑定物理，兼容数学、化学与文科记忆教学
- 色彩：蓝绿到紫色渐变，偏清晰、科技、教育感

## 规范说明

- `SVG` 是唯一母版，后续继续迭代优先修改 SVG
- `PNG` 只保留稳定导出稿，不把它当作源稿维护
- 当前导出稿统一为透明背景，不保留外围投影，避免上传后台、桌面图标和多主题场景下出现白边或脏边
- 模块内若需要拷贝导出稿，必须能追溯回 `shared-assets/brand/logo/`

## 当前使用建议

- Web / H5 / 桌面图标源：优先使用 `logo/logo-mark.svg`
- 通用位图：优先使用 `logo/logo-mark-512.png`
- 小尺寸触摸图标 / 上传场景：优先使用 `logo/logo-mark-144.png`
