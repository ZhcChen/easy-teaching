---
title: refactor: Align Newton first law lab with visual lab standards
type: refactor
status: completed
date: 2026-07-26
origin: docs/standards/visual-lab-page-spec.md
---

# refactor: Align Newton first law lab with visual lab standards

## Overview

按新的可视化实验页规范，重新收紧 `牛顿第一定律实验` 页面，让它从“已有功能的组合页”回到“适合课堂教学的实验页”。

这轮不改 topic、路由和核心物理模型，不重做整套 3D 引擎；重点是按规范重排页面骨架、控制区职责、2D 主舞台信息层级和必要 HUD，使其更贴近 `速度与位移轨迹` 的稳定体验，但不机械复制其业务细节。

## Problem Frame

当前 `web-app/app/components/newton-first-law-lab.tsx` 已有 2D / 3D、左侧控制面板、记录表和课堂结论，但与最新规范仍有明显偏差：

- 左侧控制区混入了较重的记录展示和说明，主流程与辅助信息边界不够清楚
- 2D 主舞台内文本、标记、标题和图表并列较多，视觉中心不够稳定
- 右侧舞台区虽然已有侧栏，但 2D 舞台和侧栏之间的职责还不够明确
- 页面没有把“观察 -> 记录 -> 补完对照 -> 归纳结论”的教学链路表现得足够清楚
- 该页虽然参考了 `速度与位移轨迹`，但没有真正继承“左控右演示 + 主舞台减负 + 轻量状态层”的规范化落地方式

## Requirements Trace

- R1. 页面骨架遵守 `docs/standards/visual-lab-page-spec.md`：左控右演示、主舞台优先、整页尽量不滚动。
- R2. 控制面板遵守 `docs/standards/visual-lab-components.md`：按主流程分组，复用统一控件，不在控制区和主舞台重复参数语义。
- R3. 2D 主舞台回到“器材 + 运动过程 + 必要读数”中心，减少说明型文字和重复标题。
- R4. 右侧数值区只保留必要状态、实时读数和对照摘要，不再像第二个说明面板。
- R5. 记录区继续保留“实验单”价值，但位置和信息密度要更适合课堂主流程。
- R6. 继续保留 2D / 3D 与全屏能力，且共用同一套业务参数与记录状态。
- R7. 现有交互语义保持稳定：释放、记录、切换阻力面、修改初速度、自动跳到下一待测面、结论生成。

## Scope Boundaries

- 不修改 `newton-first-law-lab` 的 topic id、目录入口和路由。
- 不引入新的后端、存储结构或物理引擎。
- 不重做 `NewtonFirstLawThreeStage` 的整体交互模型，只做必要的舞台上下文对齐。
- 不把该页扩展成多步骤教师模式或独立实验平台。

## Context & Research

### Relevant Code and Patterns

- `web-app/app/components/newton-first-law-lab.tsx`
  - 当前牛顿第一定律实验主组件，本轮主改动面
- `web-app/app/components/newton-first-law-three-stage.tsx`
  - 当前 3D 舞台，需保持参数与状态接线稳定
- `web-app/app/components/motion-track-lab.tsx`
  - 当前最成熟的参考实现页，重点借鉴其左控右演示、轻量 overlay、summary bar 与按钮层级
- `web-app/app/components/basic-force-record-table.tsx`
  - 当前记录表组件，继续复用“实验单”表达，不新造平行组件
- `web-app/app/components/control-button.tsx`
- `web-app/app/components/control-range.tsx`
- `web-app/app/components/control-chip-group.tsx`
- `web-app/app/components/control-panel-section.tsx`
- `web-app/app/components/control-status-bar.tsx`
- `web-app/app/components/status-pill.tsx`
- `web-app/app/components/visual-mode-switch.tsx`
  - 当前规范化控件来源
- `web-app/app/components/newton-first-law-lab.test.tsx`
  - 当前行为测试基线，需要随结构调整同步更新
- `web-app/app/app.css`
  - 当前承载共享实验页样式与 Newton 专用样式

### Institutional Learnings

- `docs/solutions/2026-07-24-sliding-friction-classroom-layering.md`
  - 已验证：课堂实验页应避免播放器心智，主舞台先看器材和读数，记录区保持实验单属性

### External References

- 无；本轮以仓库内新规范和既有参考页为准，不需要额外外部研究

## Key Technical Decisions

- 决策 1：保留现有单页结构，但重排为“控制主流程更清晰、主舞台信息更轻”的规范化版本
  - 原因：当前问题主要是页面组织，不是业务模型错误
- 决策 2：把 2D 舞台内的说明性文字和重复抬头下沉，优先保留运动对象、停止点、速度变化与必要曲线
  - 原因：牛顿第一定律的教学重点是“阻力越小，速度衰减越慢；无阻力时保持匀速”，不是阅读大量舞台文字
- 决策 3：右侧信息区继续保留，但压缩为“状态 + 实时读数 + 对照摘要”三层
  - 原因：这符合当前项目里“必要观看数据放右侧固定区”的稳定做法，也比把大量数值压回舞台 overlay 更稳
- 决策 4：记录表继续放左侧控制区，保持实验单属性，不把它迁回右侧主舞台
  - 原因：记录是操作链路的一部分，不应抢走主舞台的观看空间
- 决策 5：3D 模式优先保持与 2D 同一业务语义，只补空间直觉，不引入另一套教学流程
  - 原因：符合 `2D / 3D 共用一套业务参数` 的硬规范

## Visual Thesis

以“简洁的科技实验台”为方向：左侧像课堂控制台，右侧像单一观察舞台；2D 主舞台减少文案噪音，突出斜面、小车、阻力面、停止点和速度衰减曲线。

## Content Plan

1. 左侧：实验控制 -> 核心变量 -> 记录实验单 -> 思考提示
2. 右侧：主舞台 -> 轻量浮层工具 -> 右侧信息摘要
3. 2D 重点：释放与滑行轨道、同一初速度、停止点 / 理想外推、速度随时间变化
4. 3D 重点：观察空间运动和阻力差异，不额外承载大段解释

## Interaction Plan

1. 保持面板收缩 / 展开动画与本地记忆
2. 保持 2D / 3D 切换与全屏按钮的固定悬浮位置
3. 强化“开始释放 -> 记录本组 -> 自动切到下一面”的单向课堂节奏

## Implementation Units

- [x] **Unit 1: 重排 Newton 页面结构与控制区分组**

**Goal:** 让左侧控制区更符合规范化主流程，减少与主舞台重复的信息表达。

**Files:**
- Modify: `web-app/app/components/newton-first-law-lab.tsx`
- Modify: `web-app/app/app.css`
- Test: `web-app/app/components/newton-first-law-lab.test.tsx`

**Approach:**
- 保留收缩控制面板、统一标题栏和共享控件
- 将左侧 section 收紧为：实验控制、核心变量、记录实验单、思考提示
- 压缩或移除当前只起说明作用的冗余卡片和重复文案
- 保持释放、记录、重置的交互语义不变

**Patterns to follow:**
- `web-app/app/components/motion-track-lab.tsx`
- `docs/standards/visual-lab-components.md`

**Test scenarios:**
- Happy path — 首屏仍默认毛巾面、记录按钮锁定、可正常开始释放
- Happy path — 释放完成后允许记录，记录后自动跳到下一待测面
- Edge case — 修改初速度后清空记录并回到待观察状态

**Verification:**
- 控制面板职责更清晰，主流程 section 不再夹杂过多展示型内容

- [x] **Unit 2: 精简 2D 主舞台并重排右侧摘要区**

**Goal:** 让 2D 主舞台第一视觉层变成器材和运动过程，右侧只保留必要状态摘要。

**Files:**
- Modify: `web-app/app/components/newton-first-law-lab.tsx`
- Modify: `web-app/app/app.css`
- Test: `web-app/app/components/newton-first-law-lab.test.tsx`

**Approach:**
- 移除或下沉 2D SVG 内过重的标题、解释和重复读数
- 保留必要标识：同一高度释放、阻力面、停止点 / 理想外推、速度曲线
- 将状态、实时读数、距离对照压缩为右侧固定摘要区
- 对 3D 顶部 HUD 做轻量化，避免与主舞台主体争夺注意力

**Patterns to follow:**
- `web-app/app/components/motion-track-lab.tsx` 的浮层与 summary bar 层级
- `docs/solutions/2026-07-24-sliding-friction-classroom-layering.md`

**Test scenarios:**
- Happy path — 2D / 3D 仍可切换，3D mock 仍正常渲染
- Integration — 完成四组后仍显示课堂结论
- Integration — 页面在结构调整后，按钮、切换和记录链路不回归

**Verification:**
- 2D 主舞台不再像说明板，视觉重心明显回到小车、轨道和速度衰减

## Verification

- `pnpm --dir web-app test -- --run newton-first-law-lab.test.tsx`
- 必要时补充 `pnpm --dir web-app test -- --run visualization.test.tsx`
- 本地启动页面后进行一次可视化检查，确认：
  - 左控右演示结构更清楚
  - 2D 主舞台无明显文字遮挡和重叠
  - 控制面板收缩、全屏、2D / 3D 切换仍正常
