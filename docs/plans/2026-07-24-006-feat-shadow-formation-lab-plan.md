---
title: feat: Implement shadow formation lab
type: feat
status: completed
date: 2026-07-24
---

# feat: Implement shadow formation lab

## Overview

基于 `docs/brainstorms/2026-07-24-light-straight-propagation-requirements.md` 的拆题结论，优先把 `shadow-formation-lab` 落成新的真实实验页，用最短课堂链路讲清楚：

- 光沿直线传播
- 不透明物体会遮挡光线形成影子
- 点光源影子边界清晰
- 面光源会出现本影与半影

## Origin

- `docs/brainstorms/2026-07-24-light-straight-propagation-requirements.md`

## Requirements Trace

- R1. `shadow-formation-lab` 从 `planned` 进入真实实验页。
- R2. 页面必须聚焦“影子形成 / 本影半影”，不混入小孔成像、日食月食与散射扩展。
- R3. 用户进入后 5 秒内能看懂：这是在用遮挡成影证明光沿直线传播。
- R4. 页面必须支持点光源与面光源对照，并能观察影子大小和边界变化。
- R5. 页面保持当前课堂页统一结构：左侧控制、右侧单一舞台、观察后记录结论。

## Scope Boundaries

- 不实现 `pinhole-imaging-lab`
- 不实现 `eclipse-scattering-lab`
- 不做 3D 模式
- 不加入公式推导型复杂图表

## Key Decisions

- 使用纯 2D SVG 舞台，复用当前光学实验页的布局与课堂脚手架。
- 用四个课堂步骤组织内容：点光源清晰影子、面光源本影半影、物体靠近光源、光屏靠近物体。
- 右侧只保留一个可视化舞台与少量 HUD，不再新增独立下方图表区域。

## Files

- Create: `web-app/app/components/shadow-formation-lab.tsx`
- Create: `web-app/app/components/shadow-formation-lab.test.tsx`
- Modify: `web-app/app/routes/visualization.tsx`
- Modify: `web-app/app/routes/visualization.test.tsx`
- Modify: `web-app/app/routes/content-subject.test.tsx`
- Modify: `web-app/app/data/teaching-catalog.ts`
- Modify: `web-app/app/app.css`

## Patterns to Follow

- `web-app/app/components/light-reflection-lab.tsx`
- `web-app/app/components/plane-mirror-lab.tsx`
- `web-app/app/components/control-panel-section.tsx`
- `web-app/app/routes/visualization.tsx`

## Implementation Units

- [x] **Unit 1: 接入 shadow 实验页**
  - 将 `shadow-formation-lab` 从 `planned` 改为真实实验页接线
  - 更新 catalog、visualization route 与集成测试

- [x] **Unit 2: 实现课堂化影子实验舞台**
  - 左侧控制面板
  - 右侧单一 SVG 舞台
  - 支持点光源 / 面光源、本影 / 半影、位置变化

- [x] **Unit 3: 完成验证与部署**
  - 补单测
  - 跑 `npm test` / `typecheck` / `build`
  - 提交推送
  - 部署测试环境

## Test Scenarios

- Happy path — 默认进入时显示点光源步骤，且仍未记录。
- Happy path — 切换到面光源后能看到本影与半影语义。
- Happy path — 开始观察并稳定后才能记录。
- Edge case — 调整光源或位置后，旧观察失效，需要重新观察。
- Integration — 目录入口和 `/visual/shadow-formation-lab` 都进入真实实验页，而不是规划壳。

## Verification

- 页面首次进入后，用户可以直接看出“光线被遮挡后形成影子”。
- 面光源模式下，舞台明确区分本影与半影。
- `shadow-formation-lab` 在目录与路由层被视为已实现主题。
