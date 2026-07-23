---
date: 2026-07-23
title: feat: Add 3D mode to basic force lab
status: complete
---

# feat: 为基础受力分析增加 3D 模式

## Problem Frame

当前 `web-app/app/components/basic-force-lab.tsx` 已经具备完整的 2D 受力分析实验流程：参数调节、分阶段播放、受力箭头、实验记录与结论说明都已经存在。但它的视觉表达仍以平面解析图为主，真实实验感偏弱。

用户已明确认可“保留当前 2D 解析模式，同时为 `基础受力分析` 增加 3D 场景模式”的方向。目标不是用 3D 取代 2D，而是补足实验临场感、材质差异、木块/砝码/测力计的空间观察体验。

## Requirements Trace

- R1. `基础受力分析` 页面必须支持 `2D / 3D` 双模式切换，默认保持当前 2D 视图。
- R2. 3D 模式必须复用现有实验状态机与参数逻辑，不能另起一套独立的物理流程。
- R3. 3D 模式必须展示至少这些核心对象：接触面、木块、砝码、测力计、绳子。
- R4. 3D 模式必须随实验阶段变化呈现静止、起动、匀速拉动等状态，并同步关键数值。
- R5. 3D 模式必须支持鼠标左键拖动旋转视角、滚轮缩放。
- R6. 当前页面的全屏、左侧参数面板、实验播放/暂停/重置等主流程不能退化。
- R7. 2D 与 3D 的信息分工要明确：2D 偏“受力解析”，3D 偏“实验场景观察”。

## Scope Boundaries

- 本轮不引入真实刚体物理引擎，不做碰撞求解。
- 本轮不重做当前 2D 受力图逻辑。
- 本轮不新增自动化测试框架；仓库当前无 `vitest` / `playwright test` / `*.test.tsx` 体系，继续采用类型检查、构建和页面验证。
- 本轮不扩展到其他知识点，只覆盖 `topic.id === "basic-force"`。

## Context & Research

### 本地代码模式

- `web-app/app/components/basic-force-lab.tsx`
  - 已包含完整实验状态机：`computeExperimentMetrics`、`computeExperimentScene`、`computeStageLayout`
  - 已有完整的 2D 可视化层与 HUD、控制面板、全屏逻辑
- `web-app/app/components/motion-track-lab.tsx`
  - 已有成熟的 `2D / 3D` 双模式切换模式
  - 已有 `VisualModeSwitch`、本地存储持久化、3D HUD 分层、全屏兼容
- `web-app/app/components/motion-track-three-stage.tsx`
  - 已有 Three.js 场景初始化、拖拽旋转、滚轮缩放、动画帧驱动、响应式 resize 的可复用实现方式
- `web-app/package.json`
  - 已内置 `three` 与 `@types/three`

### Institutional Learnings

- `docs/solutions/` 当前只有 `.gitkeep`，无可复用历史方案。

### External Research Decision

- 不额外做外部调研。当前仓库已经有成熟的 Three.js 3D 模式范式，问题主要是复用现有交互与状态同步，不属于外部 API / 高风险集成场景。

## Key Technical Decisions

- 决策 1：`basic-force` 采用和 `motion-track` 一致的双模式结构
  原因：现有仓库已经证明这种交互方式可用，能减少 UI 与状态管理分叉。

- 决策 2：3D 模式只消费当前实验状态，不重新计算物理
  原因：避免 2D 与 3D 出现不同步；3D 只承担表现层职责。

- 决策 3：3D 视图第一版采用“场景复刻 + 关键状态强调”，不追求高复杂度物理仿真
  原因：当前用户目标是更好地“感受到实验过程”，不是构建通用物理引擎。

- 决策 4：3D 视角采用第三人称斜后观察视角，并支持旋转和缩放
  原因：和 `motion-track` 的交互一致，用户学习成本低，能更好观察木块、测力计和位移。

## High-Level Technical Design

- `BasicForceLab` 保持为实验逻辑入口，新增：
  - `viewMode` 状态
  - `VisualModeSwitch`
  - 本地存储键，用于持久化 `2d` / `3d`
- 2D 继续渲染现有 SVG 场景
- 3D 新增独立组件 `basic-force-three-stage.tsx`
  - 输入为 `BasicForceLab` 已算好的实验场景数据、接触面参数、木块尺寸、材质信息
  - 内部负责初始化 Three.js 场景、相机、灯光、地面、木块、砝码、测力计、绳子、受力高亮
  - 采用 requestAnimationFrame 做连续更新
- 主页面 HUD 不完全照搬 2D：
  - 3D HUD 保留少量必要信息：阶段、材质、摆放方式、压力、关键摩擦读数、交互提示
  - 受力详细解析仍保留在左侧控制面板与 2D 模式中

## Implementation Units

- [x] Unit 1: 为 `BasicForceLab` 接入双模式切换与模式持久化
  - Goal: 让 `basic-force` 拥有与 `motion-track` 一致的 `2D / 3D` 切换能力，默认 2D。
  - Files:
    - `web-app/app/components/basic-force-lab.tsx`
    - `web-app/app/components/visual-mode-switch.tsx`
    - `web-app/app/app.css`
  - Patterns to follow:
    - `web-app/app/components/motion-track-lab.tsx`
    - `web-app/app/components/visual-mode-switch.tsx`
  - Approach:
    - 新增 `ForceViewMode = "2d" | "3d"`
    - 新增 localStorage key
    - 将当前右侧主舞台拆成 2D / 3D 条件渲染
    - 在右上区域保留全屏按钮，在左上区域加入模式切换
  - Test files:
    - 无现成自动化测试文件；继续采用手工验证
  - Test scenarios:
    - 打开页面默认显示 2D 模式
    - 切换到 3D 后刷新页面，仍保持 3D
    - 切换模式不影响左侧控制面板当前参数
  - Verification:
    - `npm run typecheck`
    - 页面手工验证 `basic-force` 模式切换、全屏、面板联动

- [x] Unit 2: 构建基础受力分析 3D 舞台组件
  - Goal: 用 Three.js 呈现可观察的实验场景，复用当前实验状态输出。
  - Files:
    - `web-app/app/components/basic-force-three-stage.tsx`
    - `web-app/app/components/basic-force-lab.tsx`
    - `web-app/app/app.css`
  - Patterns to follow:
    - `web-app/app/components/motion-track-three-stage.tsx`
  - Approach:
    - 构建接触面、木块、砝码、测力计、绳子、阴影等基础几何体
    - 复用 `displayedScene.travelProgress` 驱动木块位移
    - 复用 `surfacePresetMeta`、`contactAreaMeta` 驱动材质颜色与木块尺寸比例
    - 复用 `pressure` 驱动砝码数量或视觉密度
    - 使用第三人称跟随相机，支持拖拽旋转与滚轮缩放
  - Test files:
    - 无现成自动化测试文件；继续采用手工验证
  - Test scenarios:
    - 播放实验时木块会从静止进入起动、再进入匀速滑动
    - 切换不同接触材质时，地面或材质色彩有明显区分
    - 切换不同摆放方式时，木块长宽高比例变化可见
    - 改变压力时，砝码视觉表现变化且与 HUD 数据同步
    - 3D 视图支持拖拽旋转、滚轮缩放
  - Verification:
    - `npm run typecheck`
    - `npm run build`
    - 页面手工验证 3D 动画与交互

- [x] Unit 3: 整理 3D HUD 与 2D/3D 信息分工
  - Goal: 避免 3D 画面被信息遮挡，同时让核心结论仍然可读。
  - Files:
    - `web-app/app/components/basic-force-lab.tsx`
    - `web-app/app/app.css`
  - Patterns to follow:
    - `web-app/app/components/motion-track-lab.tsx`
  - Approach:
    - 3D 模式仅保留少量 HUD：阶段、模式、材质、压力、摩擦关键值、操作提示
    - 2D 模式继续保留现有受力解析叠层
    - 调整右侧画布层级和暗色背景，让 3D 更有沉浸感
  - Test files:
    - 无现成自动化测试文件；继续采用手工验证
  - Test scenarios:
    - 3D HUD 不遮挡主要观察对象
    - 2D 模式原有 HUD 不退化
    - 全屏状态下 3D HUD、切换按钮、全屏按钮位置正确
  - Verification:
    - 手工验证亮/暗主题与全屏表现

## System-Wide Impact

- `web-app/app/routes/visualization.tsx`
  - 不需要改路由分支；`basic-force` 仍由 `BasicForceLab` 统一承接
- Three.js 负载
  - 新增 3D 组件会提高 `basic-force` 页面渲染负担，但仓库已有 `motion-track-three-stage.tsx` 作为基线
- 本地存储
  - 会新增 `basic-force` 独立的视图模式存储键，避免和 `motion-track` 共用

## Risks & Dependencies

- 风险 1：3D 画面复杂后遮挡主内容
  - Mitigation: 第一版只保留轻 HUD，避免重复展示所有 2D 信息

- 风险 2：3D 场景与现有实验状态不同步
  - Mitigation: 所有 3D 动画只消费 `displayedScene` / `metrics` / `contactAreaMeta` 等既有结果

- 风险 3：交互与性能抖动
  - Mitigation: 参考 `motion-track-three-stage.tsx` 的事件绑定与渲染策略，避免重复创建几何体

## Open Questions

### Deferred to Implementation

- [Affects R3, R4][Technical] 砝码视觉是采用固定数量离散块，还是采用随压力变化的层叠规则；实现时以视觉清晰度优先。
- [Affects R4][Technical] 3D 模式是否需要直接绘制受力箭头；第一版可先用 HUD + 物体运动表现，再决定是否加入箭头网格。

## Verification Strategy

- 构建验证：
  - `npm run typecheck`
  - `npm run build`
- 页面验证：
  - `http://localhost:57001/visual/basic-force`
  - 验证 2D / 3D 切换、全屏、拖拽旋转、滚轮缩放、参数联动、播放阶段同步

## Next Steps

→ `/prompts:ce-work` 执行该计划
