---
date: 2026-07-23
title: feat: Add charts and motion modes to basic force lab
status: complete
---

# feat: 为基础受力分析增加图表曲线与运动模式

## Problem Frame

当前 `basic-force` 已具备 2D 受力示意与 3D 实验场景，但整体仍偏“单次器材演示”。
和 `motion-track` 相比，它缺少统一的时间序列、实时图表和模式切换，因此用户难以同时观察“受力变化”和“运动结果变化”。

## Requirements Trace

- R1. `basic-force` 必须新增“运动模式”，至少包含“实验测量”和“恒力拉动”。
- R2. 2D 模式必须增加实时图表曲线，至少覆盖受力曲线与运动结果曲线。
- R3. 2D / 3D 必须消费同一份实验时间序列，避免状态不同步。
- R4. 左侧控制面板、播放控制、时间轴、全屏、2D/3D 切换不能退化。
- R5. 交互结构与视觉组织应尽量参考 `motion-track`，形成统一的教学模块体验。

## Scope Boundaries

- 本轮不引入真实物理引擎。
- 本轮不抽离通用图表基础组件，先在 `basic-force` 内完成功能闭环。
- 本轮不扩展到其他知识点，只覆盖 `topic.id === "basic-force"`。

## Context & Research

### Relevant Code and Patterns

- `web-app/app/components/motion-track-lab.tsx`
  - 已有成熟的 2D/3D 双模式、时间轴、图表面板、底部结果条
- `web-app/app/components/basic-force-lab.tsx`
  - 已有实验逻辑、参数面板、播放控制、3D 接入
- `web-app/app/components/basic-force-three-stage.tsx`
  - 已有 3D 场景与时间进度联动
- `web-app/app/components/control-chip-group.tsx`
  - 可直接复用为“运动模式”切换控件

### Institutional Learnings

- 当前 `docs/solutions/` 无相关沉淀，本轮按现有模块模式收敛实现。

## Key Technical Decisions

- 以 `motion-track` 的“同一状态驱动 2D/3D/图表”作为主模式。
- 新增 `实验模式` 状态，不再把 `basic-force` 固定成单一播放脚本。
- 2D 视图从“单纯受力示意图”升级为“上方实验区 + 下方图表区”的组合布局。
- 第一版图表先直接内嵌在 `basic-force-lab.tsx`，降低拆分复杂度。

## Implementation Units

- [x] Unit 1: 接入运动模式与统一时间序列
  - Goal: 让 `basic-force` 同时支持“实验测量”和“恒力拉动”，并输出统一实验状态。
  - Files:
    - `web-app/app/components/basic-force-lab.tsx`
    - `web-app/app/components/basic-force-three-stage.tsx`
  - Patterns to follow:
    - `web-app/app/components/motion-track-lab.tsx`
  - Test scenarios:
    - 实验测量模式仍可完成原有起动 / 匀速测量流程
    - 恒力拉动模式下，当拉力不足时木块不运动
    - 恒力拉动模式下，当拉力超过最大静摩擦时木块进入运动
    - 2D 与 3D 在同一时间轴位置显示相同阶段和读数
  - Verification:
    - 页面手工验证两种模式切换、播放、时间轴和 3D 联动

- [x] Unit 2: 为 2D 模式增加图表化布局
  - Goal: 让 2D 模式同时展示实验示意和实时曲线。
  - Files:
    - `web-app/app/components/basic-force-lab.tsx`
    - `web-app/app/app.css`
  - Patterns to follow:
    - `web-app/app/components/motion-track-lab.tsx`
    - `web-app/app/app.css` 中 `motion-stage-*` 相关图表样式
  - Test scenarios:
    - 2D 模式展示受力曲线
    - 2D 模式展示位移/速度曲线
    - 播放、暂停、拖动时间轴时图表实时更新
    - 图表不会遮挡主实验视图
  - Verification:
    - 页面手工验证 2D 图表与实验示意同步

- [x] Unit 3: 调整 HUD / 结果展示与模式说明
  - Goal: 让 2D/3D 的信息组织更统一，并补充模式语义。
  - Files:
    - `web-app/app/components/basic-force-lab.tsx`
    - `web-app/app/app.css`
  - Patterns to follow:
    - `web-app/app/components/motion-track-lab.tsx`
  - Test scenarios:
    - 模式切换后 HUD 文案与结论同步变化
    - 3D 模式下仍能清楚看到关键统计与器材状态
    - 全屏状态下 2D/3D 布局不乱
  - Verification:
    - 亮/暗主题、全屏、模式切换手工验证通过

## Verification Strategy

- `npm run typecheck`
- `npm run build`
- 页面验证：
  - `http://localhost:57001/visual/basic-force`
