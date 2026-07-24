---
date: 2026-07-23
title: feat: Add series and parallel circuit observer lab
status: completed
---

# feat: 为串并联电路观察新增沉浸式 2D 实验页

## Problem Frame

当前 `circuit-observer` 已经出现在知识点目录里，但 `web-app/app/routes/visualization.tsx` 还没有对应实验组件，进入后只会落到默认占位可视化壳层。

这个知识点和 `motion-track`、`basic-force` 的差别在于：它不是时间驱动实验，而是“电路结构变化 -> 电流/电压重新分配 -> 灯泡亮灭与亮度变化”的状态观察实验。第一版更适合做成一个 **2D 电路实验台**，让用户通过切换串联/并联、开关状态、灯泡电阻与故障状态，直接观察：

- 串联：`I = I₁ = I₂`、`U = U₁ + U₂`
- 并联：`U = U₁ = U₂`、`I = I₁ + I₂`
- 串并联在“一个灯泡断开”时的本质差异

## Planning Input & Sources

- 用户输入：`接下来是 串并联电路观察`
- 归档资料：`docs/archive/可视化教学/物理实验可视化/电学_1_串并联电路电流电压规律.docx`

归档资料已经明确了本实验的核心教学目标、演示场景、示例数据和建议交互，因此本次直接进入技术规划，不单独补一份 brainstorm 文档。

## Requirements Trace

- R1. `/visual/circuit-observer` 必须替换掉默认占位壳层，接入独立实验组件。
- R2. 第一版仅做 **2D 电路实验台**，不引入 3D 视图。
- R3. 必须支持 **串联 / 并联** 两种连接方式切换，并实时刷新灯泡亮灭与测量数值。
- R4. 必须支持至少以下参数：电源开关、电源电压、两个灯泡电阻/规格、单灯开断或故障状态。
- R5. 必须在同一画布中同时呈现：电路连线、开关状态、灯泡亮度、关键电表读数/公式结论。
- R6. 必须能直观看到“串联一处断开全灭，并联单支路断开其余仍工作”的差异。
- R7. 左侧控制面板、右侧主实验区、全屏按钮、亮暗主题风格，必须延续现有 `motion-track` / `basic-force` 体验。

## Scope Boundaries

- 本轮不实现 3D 电学场景。
- 本轮不实现混联电路。
- 本轮不做拖拽式自由接线编辑器，先固定为“两灯泡 + 开关 + 电源”的标准教学布局。
- 本轮不实现真实电表拖拽摆放，只做“测量重点切换 + 固定读数展示”。
- 本轮不引入独立物理引擎或电路求解库，直接在组件内用确定性公式推导。

## Context & Research

### Relevant Code and Patterns

- `web-app/app/routes/visualization.tsx`
  - 目前只对 `basic-force` 和 `motion-track` 做了专用实验页分发；`circuit-observer` 应接入同一分发入口。
- `web-app/app/components/motion-track-lab.tsx`
  - 提供成熟的“左控制面板 + 右沉浸实验区 + 全屏 + HUD”布局样式与交互节奏。
- `web-app/app/components/basic-force-lab.tsx`
  - 提供多模式实验、控制面板收起、本地状态持久化、图表/结果浮层组织方式。
- `web-app/app/components/control-panel-section.tsx`
- `web-app/app/components/control-chip-group.tsx`
- `web-app/app/components/control-range.tsx`
- `web-app/app/components/control-status-bar.tsx`
- `web-app/app/components/status-pill.tsx`
  - 都可直接复用于电路实验控制区。
- `web-app/app/app.css`
  - 已有 `force-*` / `motion-*` 的实验布局、全屏、沉浸画布和控制面板样式，可在同一命名体系下新增 `circuit-*`。
- `web-app/app/data/teaching-catalog.ts`
  - `circuit-observer` 已存在目录数据，后续只需更新状态/高亮文案而不必新增目录入口。

### Repo Constraints

- `web-app` 当前只有 `typecheck` / `build`，没有成体系的前端自动化测试或组件测试框架。
- 因此本轮验证以：
  - `npm --prefix web-app run typecheck`
  - `npm --prefix web-app run build`
  - 手工场景验证
  为主。

### External Research Decision

当前代码库已有成熟的沉浸实验布局模式，且归档资料已经给出电学规律、示例数据和交互建议，因此本次 **不额外做外部资料研究**，直接按本地模式和归档资料收敛实现。

## Key Technical Decisions

- **D1. 先做固定结构实验，不做自由布线。**
  - 原因：本知识点的核心是观察串并联规律，而不是训练电路搭建操作本身。固定两灯泡结构能更快把规律表达清楚。

- **D2. 采用“配置状态 -> 派生电路结果”的纯公式模型。**
  - 计划在组件内维护 `topology / sourceVoltage / bulbResistance / switchState / faultState` 等输入状态，再通过 `useMemo` 派生：
    - 总电流 / 支路电流
    - 总电压 / 单灯电压
    - 灯泡亮度（按功率归一化）
    - 激活的导线高亮路径
    - 观察结论文案
  - 原因：这一类实验是静态电路状态求值，不需要像运动/受力那样建立时间序列。

- **D3. 第一版聚焦三个观察重点：电流、电压、故障。**
  - 控制面板中提供“观察重点”切换，右侧 HUD 和路径高亮随之变化。
  - 原因：对应归档资料中的三类核心场景，能避免画面里同时堆过多数值。

- **D4. 灯泡亮度按功率映射，不追求真实发光渲染。**
  - 建议亮度基础公式：
    - `P = I²R` 或 `P = U² / R`
  - 再按当前场景中的最大功率做归一化，映射到 glow / 填充亮度。
  - 原因：这足够支撑课堂观察“谁更亮”，同时实现简单稳定。

- **D5. 控制面板与实验区继续沿用现有沉浸实验布局。**
  - 不再使用默认 `visual-shell` 占位样式。
  - 原因：与前两个核心实验保持统一体验，后续用户在知识点间切换时不会出现交互断层。

## High-Level Technical Design

### State Model

输入状态建议收敛为：

- `topology: "series" | "parallel"`
- `focusMode: "current" | "voltage" | "fault"`
- `sourceVoltage: number`
- `masterSwitchClosed: boolean`
- `bulbAResistance: number`
- `bulbBResistance: number`
- `bulbAEnabled: boolean`
- `bulbBEnabled: boolean`

由此派生：

- `seriesResult`
  - `mainCurrent`
  - `bulbAVoltage`
  - `bulbBVoltage`
  - `bulbABrightness`
  - `bulbBBrightness`
  - `allOffBecauseOpen`
- `parallelResult`
  - `branchACurrent`
  - `branchBCurrent`
  - `mainCurrent`
  - `branchVoltage`
  - `bulbABrightness`
  - `bulbBBrightness`
  - `branchAActive`
  - `branchBActive`
- `activeSegments`
  - 右侧 SVG 里哪些导线段/节点需要高亮
- `observationSummary`
  - 当前重点下的 1-2 句结论

### Visual Composition

右侧实验区建议维持“单一主画布”：

- 中央：电池、总开关、导线、两灯泡的标准电路图
- 灯泡：根据亮度映射 glow 与填充强度
- 导线：通电路径高亮，并沿高亮路径做轻量流动动画
- 四角小 HUD：
  - 左上：当前连接方式、观察重点
  - 右上：总电流 / 总电压
  - 左下或底部：`I/U` 关键公式关系
  - 右侧：灯泡 A/B 的局部数值
- 右上保留全屏按钮

### Data Truth Examples

计划用归档资料中的示例值作为实现与验证基准：

- 串联示例：
  - `U = 6V`
  - `R₁ = 12Ω`
  - `R₂ = 8Ω`
  - 应得：
    - `I = 6 / (12 + 8) = 0.30A`
    - `U₁ = 3.6V`
    - `U₂ = 2.4V`
- 并联示例：
  - `U = 6V`
  - `R₁ = 15Ω`
  - `R₂ = 30Ω`
  - 应得：
    - `I₁ = 0.40A`
    - `I₂ = 0.20A`
    - `I = 0.60A`

## Implementation Units

- [x] Unit 1: 接入 `circuit-observer` 实验页入口
  - Goal: 让 `/visual/circuit-observer` 渲染专用实验组件，而不是默认占位壳层。
  - Files:
    - `web-app/app/routes/visualization.tsx`
    - `web-app/app/components/circuit-observer-lab.tsx`
    - `web-app/app/data/teaching-catalog.ts`
    - `web-app/app/i18n.tsx`
  - Patterns to follow:
    - `web-app/app/routes/visualization.tsx`
    - `web-app/app/components/motion-track-lab.tsx`
    - `web-app/app/components/basic-force-lab.tsx`
  - Test files:
    - 当前仓库无 `web-app` 自动化测试基建；本单元先以手工验证为主
    - 若补前端组件测试，新增路径建议为 `web-app/app/components/__tests__/circuit-observer-lab.test.tsx`
  - Test scenarios:
    - 访问 `/visual/circuit-observer` 时进入专用实验页
    - `motion-track` / `basic-force` 路由行为不退化
    - 知识点卡片点击到目标路由后，标题和元信息正确
  - Verification:
    - 手工验证 `/content/junior/physics` -> `串并联电路观察` -> 实验页跳转链路

- [x] Unit 2: 构建串并联电路派生计算模型
  - Goal: 用确定性公式驱动串联/并联的电流、电压、亮度与故障差异。
  - Files:
    - `web-app/app/components/circuit-observer-lab.tsx`
  - Patterns to follow:
    - `web-app/app/components/basic-force-lab.tsx` 中“输入状态 -> useMemo 派生结果”的组织方式
  - Test files:
    - 当前仓库无自动化测试基建；如补测试，目标路径为 `web-app/app/components/__tests__/circuit-observer-lab.test.tsx`
  - Test scenarios:
    - 串联 `6V / 12Ω / 8Ω` 时得到 `I=0.30A, U₁=3.6V, U₂=2.4V`
    - 并联 `6V / 15Ω / 30Ω` 时得到 `I₁=0.40A, I₂=0.20A, I=0.60A`
    - 总开关断开时，两种电路都无电流、两灯全灭
    - 串联状态下任一灯泡断开时，全电路断开
    - 并联状态下仅一支路断开时，另一支路仍保持正常工作
  - Verification:
    - 对照归档示例数据手工验算与页面数值一致

- [x] Unit 3: 实现沉浸式 2D 电路画布与路径高亮
  - Goal: 在右侧实验区中清楚表达电路结构、通电路径和灯泡亮灭差异。
  - Files:
    - `web-app/app/components/circuit-observer-lab.tsx`
    - `web-app/app/app.css`
  - Patterns to follow:
    - `web-app/app/components/motion-track-lab.tsx`
    - `web-app/app/app.css` 中 `motion-*` / `force-*` 的沉浸布局与全屏样式
  - Test files:
    - 当前仓库无自动化测试基建；如补测试，目标路径为 `web-app/app/components/__tests__/circuit-observer-lab.test.tsx`
  - Test scenarios:
    - 串联模式下高亮路径为单一闭环
    - 并联模式下高亮路径可拆成两条支路
    - 灯泡亮度会随电阻、电压、支路状态变化而变化
    - 全屏状态下画布比例与 HUD 不错位
    - 亮暗主题下导线、节点、灯泡 glow 仍可辨识
  - Verification:
    - 手工验证亮暗主题、普通态、全屏态的视觉可读性

- [x] Unit 4: 接入控制面板、观察重点与课堂结论 HUD
  - Goal: 让左侧操作面板与右侧说明浮层形成可教学的观察流程。
  - Files:
    - `web-app/app/components/circuit-observer-lab.tsx`
    - `web-app/app/app.css`
    - `web-app/app/i18n.tsx`
  - Patterns to follow:
    - `web-app/app/components/control-panel-section.tsx`
    - `web-app/app/components/control-chip-group.tsx`
    - `web-app/app/components/control-range.tsx`
    - `web-app/app/components/control-status-bar.tsx`
    - `web-app/app/components/status-pill.tsx`
  - Test files:
    - 当前仓库无自动化测试基建；如补测试，目标路径为 `web-app/app/components/__tests__/circuit-observer-lab.test.tsx`
  - Test scenarios:
    - 控制面板可切换串联/并联、观察重点和开关状态
    - 切换“电流 / 电压 / 故障”后，HUD 文案和高亮重点同步变化
    - 控制面板收起后，主实验区宽度自适应恢复
    - 本地刷新后可保留必要的电路实验视图偏好（如需要持久化）
  - Verification:
    - 手工验证控制面板展开/收起、参数切换、HUD 同步和本地刷新体验

## System-Wide Impact

- `web-app/app/routes/visualization.tsx`
  - 会新增一个 topic-id 分发分支；必须确保既有 `basic-force` / `motion-track` 分发不受影响。
- `web-app/app/data/teaching-catalog.ts`
  - 如果将 `circuit-observer` 的 `status` 从“后续扩展”调成“优先开发”或“可开始”，会同步影响知识点卡片展示语义。
- `web-app/app/i18n.tsx`
  - 新增的实验文案需要补齐中英映射，避免英语界面局部漏翻。
- `app`
  - 无需单独改 Electron 壳层；桌面端会直接消费更新后的 `web-app` 构建结果。

## Risks & Dependencies

- **公式正确性风险**
  - 风险：一旦串/并联数值模型写错，整个实验就会误导教学。
  - 缓解：以归档资料中的两组示例值作为验算基准，先锁定公式正确性，再调视觉。

- **画面信息过载风险**
  - 风险：电路图、数值、公式、故障状态同时展示时容易挤占主画布。
  - 缓解：通过“观察重点”切换控制显示密度，默认只显示必要指标。

- **控制面板复杂度上升**
  - 风险：如果一版就放入过多电学参数，会破坏现有实验页的简洁感。
  - 缓解：第一版只保留两灯泡、基础开关、电压、电阻和故障开断，不扩展混联/多支路。

- **自动化验证缺口**
  - 风险：当前 `web-app` 无现成测试基建，主要依赖手工验证。
  - 缓解：计划中明确列出数值场景和交互验证矩阵；若后续该模块继续扩展，再考虑补前端测试基建。

## Open Questions

### Resolved During Planning

- 是否需要 3D？
  - 结论：**不需要**。本知识点的核心是结构/数值关系，不是空间沉浸。

- 是否需要自由接线？
  - 结论：**不需要**。第一版以固定教学结构优先把规律讲清楚。

- 是否需要真实电表拖拽？
  - 结论：**不需要**。第一版用“观察重点切换 + 固定读数区”即可表达规律。

### Deferred to Implementation

- `circuit-observer` 的目录状态文案最终改为“优先开发”还是“可开始”
  - 取决于实现完成后是否希望在知识点页显式强调其已经可用。

- 是否为实验视图增加本地持久化（例如记住上次的连接方式或观察重点）
  - 非阻塞，可在实现时根据体验成本决定。

## Verification Strategy

- Static checks:
  - `npm --prefix web-app run typecheck`
  - `npm --prefix web-app run build`
- Manual route verification:
  - `http://localhost:57001/content/junior/physics`
  - `http://localhost:57001/visual/circuit-observer`
- Manual scenario matrix:
  - 串联基准值验算
  - 并联基准值验算
  - 串联单灯断开全灭
  - 并联单支路断开另一支路继续点亮
  - 全屏 / 亮主题 / 暗主题 / 控制面板收起联动验证
