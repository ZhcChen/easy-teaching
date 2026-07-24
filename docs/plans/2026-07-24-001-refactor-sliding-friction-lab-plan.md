---
title: refactor: Realign current force topic as sliding friction lab
type: refactor
status: completed
date: 2026-07-24
origin: docs/brainstorms/2026-07-24-sliding-friction-lab-alignment-requirements.md
---

# refactor: Realign current force topic as sliding friction lab

## Overview

将当前知识库中的“基础受力分析”实验页正式收敛为“滑动摩擦力影响因素实验”，同步修正知识点命名、topic 映射、页面文案和主教学结构，避免继续在错误知识点定义上迭代。

## Problem Frame

当前模块的页面实现、参数组织和归档资料都在指向“滑动摩擦力影响因素实验”，但知识点命名仍是“基础受力分析”。

这导致两个问题：

- 产品层：知识点卡片、页面标题和实际课堂内容不一致
- 教学层：页面同时承担摩擦实验、通用受力分析、运动学图表和交互试玩，学生难以快速抓住本节结论

本轮以归档文档 `docs/archive/可视化教学/物理实验可视化/力学_3_滑动摩擦力影响因素实验.docx` 为主依据，对当前模块做知识点与教学结构对齐。

## Requirements Trace

- R1. 当前 `basic-force` 对应知识点必须正式对齐为“滑动摩擦力影响因素实验”。
- R2. 知识点摘要、标签、亮点、页面标题、路由解析和相关文案必须同步更新。
- R3. 旧 `basic-force` 访问路径需要兼容，避免旧链接失效。
- R4. 页面默认必须突出匀速拉动测量原理与三条实验结论。
- R5. 页面主流程必须围绕课堂实验顺序组织。
- R6. 与主实验无关的泛化受力分析或运动学内容必须降级。
- R7. 2D 必须是主教学视图。
- R8. 3D 必须退到辅助观察定位。
- R9. 页面必须支持多组结果记录与对照。

## Scope Boundaries

- 不扩展成通用“基础受力分析”平台。
- 不新增新的物理引擎、碰撞模拟或通用图表基建。
- 不新开独立页面，只修正并重构当前实验页。

## Context & Research

### Relevant Code and Patterns

- `web-app/app/data/teaching-catalog.ts`
  - 当前知识点定义入口，负责 title、summary、tags、highlights 和 topic id
- `web-app/app/routes/visualization.tsx`
  - 当前沉浸式实验页分发入口
- `web-app/app/routes/content-subject.tsx`
  - 当前知识点卡片主题样式分发
- `web-app/app/components/basic-force-lab.tsx`
  - 当前 2D / 3D 摩擦实验主组件，已具备参数、播放、图表与记录逻辑
- `web-app/app/components/basic-force-three-stage.tsx`
  - 当前 3D 实验场景组件
- `web-app/app/components/motion-track-lab.tsx`
  - 当前沉浸式实验页的布局和 HUD 组织参考

### Institutional Learnings

- `docs/archive/可视化教学/物理实验可视化/力学_3_滑动摩擦力影响因素实验.docx`
  - 明确给出实验装置、变量、课堂步骤和“多组对照 + 数据汇总”的教学重点
- `docs/plans/2026-07-23-001-feat-basic-force-3d-mode-plan.md`
  - 记录了当前 3D 模式接入方式，可作为本轮保留辅助 3D 视图的基础
- `docs/plans/2026-07-23-002-feat-basic-force-graphs-modes-plan.md`
  - 记录了当前图表与多模式设计，但本轮需要重新评估其是否仍适合该实验的教学目标

## Key Technical Decisions

- 决策 1：知识点展示名统一改为“滑动摩擦力影响因素实验”
  - 原因：和归档资料、页面实现和课堂实验目标保持一致
- 决策 2：保留旧 `basic-force` 路由兼容，但主 topic id 迁移到更准确的实验标识
  - 原因：同时满足命名收敛与历史路径兼容
- 决策 3：2D 视图重新回到“实验装置 + 读数 + 对照结论”主线
  - 原因：这是本知识点的核心教学价值，不应再被运动学图层主导
- 决策 4：3D 保留为辅助观察模式
  - 原因：3D 的价值在于器材临场感，而不是承担结论讲解主流程
- 决策 5：多组对照结果优先用记录表和对照卡呈现
  - 原因：比位移/速度曲线更符合该实验的课堂认知路径

## Open Questions

### Resolved During Planning

- 旧命名是否继续保留为展示名称：否，展示名称统一切换到“滑动摩擦力影响因素实验”。
- 3D 是否删除：否，保留，但降级为辅助观察模式。

### Deferred to Implementation

- 结果区是以“数据表 + 柱状对照”为主，还是“数据表 + 对照卡”为主，可在实现中根据现有布局密度微调。
- 旧组件文件是否本轮整体改名，还是仅保留内部兼容命名，可在执行时按影响范围判断。

## Implementation Units

- [x] **Unit 1: 修正知识点命名、topic 映射与旧路由兼容**

**Goal:** 让当前实验页在数据层、页面入口和知识点卡片层面对齐“滑动摩擦力影响因素实验”。

**Requirements:** R1, R2, R3

**Dependencies:** None

**Files:**
- Modify: `web-app/app/data/teaching-catalog.ts`
- Modify: `web-app/app/routes/visualization.tsx`
- Modify: `web-app/app/routes/content-subject.tsx`
- Modify: `web-app/app/i18n.tsx`

**Approach:**
- 将当前初中物理知识点 title、summary、tags、highlights 改为滑动摩擦实验语义
- 将主 topic id 改为新的实验标识，同时在 `getTopicById` 中兼容旧 `basic-force`
- 更新知识点卡片主题映射和沉浸式页面分发条件，确保新旧 id 都能进入当前实验页

**Patterns to follow:**
- `web-app/app/data/teaching-catalog.ts` 中现有 topic 定义结构
- `web-app/app/routes/visualization.tsx` 中 `motion-track`、`circuit-observer` 的专用页分发方式

**Test scenarios:**
- Happy path — 从知识库卡片进入实验页时，显示标题为“滑动摩擦力影响因素实验”
- Happy path — 直接访问新 topic id 路由时，能正常打开沉浸式实验页
- Integration — 直接访问旧 `/visual/basic-force` 路由时，仍能正常落到当前实验页
- Integration — 知识点卡片主题样式仍保持当前 `is-force` 风格，不影响其他知识点

**Verification:**
- 知识库卡片标题、页面标题与实验内容一致
- 新旧路由都能打开同一个实验页

- [x] **Unit 2: 将左侧控制与顶部流程重构为课堂实验顺序**

**Goal:** 让页面主流程不再像功能切换器，而更像课堂实验步骤。

**Requirements:** R4, R5, R6

**Dependencies:** Unit 1

**Files:**
- Modify: `web-app/app/components/basic-force-lab.tsx`
- Modify: `web-app/app/app.css`

**Approach:**
- 重新整理左侧面板层级，突出“变量控制 -> 开始实验 -> 记录本组 -> 对照下一组”
- 将当前 `实验测量 / 恒力拉动 / 手动拖动` 从主入口中降级；默认聚焦“实验测量”
- 收紧顶部步骤条和阶段文案，让其围绕文档中的实验步骤表达，而不是功能模式表达

**Patterns to follow:**
- `web-app/app/components/circuit-observer-lab.tsx` 中近期收紧 HUD 的处理方式
- 当前 `basic-force-lab.tsx` 内已有的 `experimentStatus` 与 `phaseSteps` 状态派生方式

**Test scenarios:**
- Happy path — 默认进入页面时，用户能直接理解“先调变量，再做测量，再记录结果”
- Happy path — 开始实验后，阶段提示围绕“增大拉力 -> 起动 -> 匀速读数 -> 记录结果”推进
- Edge case — 收起左侧面板后，主舞台仍保留清晰的实验上下文，不丢失核心引导

**Verification:**
- 页面首屏教学语义更集中，不再要求用户先理解多个模式差异

- [x] **Unit 3: 重构 2D 主舞台，突出装置、受力关系与测力计稳定读数**

**Goal:** 让 2D 视图回到“滑动摩擦实验”的主教学载体角色。

**Requirements:** R4, R6, R7, R8

**Dependencies:** Unit 2

**Files:**
- Modify: `web-app/app/components/basic-force-lab.tsx`
- Modify: `web-app/app/app.css`
- Modify: `web-app/app/components/basic-force-three-stage.tsx`

**Approach:**
- 弱化当前舞台中不必要的运动学叠层，将主要关注点收回到木块、受力箭头、测力计和表面变量
- 默认突出“匀速时 F拉 = f”，并在静摩擦突破前后给出更直观的状态切换
- 保留 3D 场景，但同步调整 HUD，使其只承担器材观察和状态辅助展示

**Patterns to follow:**
- `web-app/app/components/basic-force-lab.tsx` 现有受力箭头、阶段状态与 3D 共享状态机
- `web-app/app/components/motion-track-lab.tsx` 的 2D / 3D 切换入口布局

**Test scenarios:**
- Happy path — 2D 视图中能清楚看出木块、测力计、接触面和 4 个主要受力方向
- Happy path — 进入匀速测量阶段时，读数区明确强调当前稳定拉力就是滑动摩擦力
- Integration — 切到 3D 模式后，参数、阶段和读数仍与 2D 同步
- Edge case — 亮暗主题和全屏下，读数与受力箭头不互相遮挡

**Verification:**
- 2D 视图可独立承担课堂讲解
- 3D 视图不再抢占主教学结构

- [x] **Unit 4: 用多组记录与对照结果替换主结论区的运动学优先级**

**Goal:** 让页面真正支持“压力 / 材质 / 接触面积”的课堂对照和结论归纳。

**Requirements:** R5, R6, R9

**Dependencies:** Unit 2, Unit 3

**Files:**
- Modify: `web-app/app/components/basic-force-lab.tsx`
- Modify: `web-app/app/app.css`

**Approach:**
- 复用当前已有 `runRecords` 基础，新增更明确的结果记录区
- 结果区优先展示：当前组数据、历史记录、多组对照结论
- 当前位移/速度曲线若保留，仅作为辅助折叠信息，不再占据主结论位

**Patterns to follow:**
- `basic-force-lab.tsx` 中现有 `latestRecord` 与实验完成态逻辑
- `motion-track-lab.tsx` 中信息卡与统计条的紧凑布局方式

**Test scenarios:**
- Happy path — 完成一组匀速测量后，当前组数据能被记录并显示在对照区
- Happy path — 连续改变压力完成多组实验后，能明显看出压力增大、摩擦力增大
- Happy path — 在压力不变时切换材质，能明显看出材质越粗糙、摩擦力越大
- Happy path — 改变接触面积时，对照区能辅助得出“摩擦力基本不变”的结论
- Edge case — 无历史记录时，结果区展示空状态引导，不出现残缺表格

**Verification:**
- 页面可以独立完成一轮课堂对照演示并直接给出结论

## System-Wide Impact

- **Interaction graph:** 影响知识库卡片、沉浸式实验页分发、topic 路由解析和当前力学实验组件
- **Error propagation:** 若 topic id 兼容处理遗漏，旧链接会直接进入“未找到知识点”
- **State lifecycle risks:** 组件内部 localStorage key、视图模式和面板收起状态若同步改名，需要考虑旧键兼容
- **Integration coverage:** 新旧路由、知识库入口、全屏、2D/3D 切换都需要一起验证
- **Unchanged invariants:** `motion-track` 与 `circuit-observer` 的入口、样式和交互结构不应退化

## Risks & Dependencies

- 风险 1：一次性同时改命名和页面结构，容易漏改旧 `basic-force` 引用
  - Mitigation: 先统一 topic 映射与别名，再做页面层改造
- 风险 2：移除过多运动学信息后，已有交互显得割裂
  - Mitigation: 允许保留为辅助信息，但不再占据主结论位
- 风险 3：3D 模式保留后仍可能承载过多 HUD
  - Mitigation: 明确 3D 只展示器材观察所需的最少状态

## Verification Strategy

- `npm --prefix web-app run typecheck`
- `npm --prefix web-app run build`
- 页面验证：
  - `http://localhost:57001/content/junior/physics`
  - `http://localhost:57001/visual/sliding-friction-lab`
  - `http://localhost:57001/visual/basic-force`
