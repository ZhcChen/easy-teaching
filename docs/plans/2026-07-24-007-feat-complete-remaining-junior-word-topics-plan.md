---
title: feat: Complete remaining junior Word-backed physics topics
type: feat
status: completed
date: 2026-07-24
---

# feat: Complete remaining junior Word-backed physics topics

## Overview

用户已确认优先执行“先把初中 Word 剩余内容补完”，并要求完成后直接部署测试环境。当前 `web-app` 中初中物理仍有 7 个 Word 归档主题未落成真实实验页，目录状态也仍显示为 backlog。此轮目标是把这些剩余主题统一落成可直接进入的课堂实验页，并保持现有页面的科技简约风、左侧控制面板、右侧主舞台、纯静态站点部署模式。

## Problem Frame

当前问题已经不是“有没有物理内容”，而是“初中物理目录是否完整可教”：

- 已有一批实验页，但剩余 Word 主题仍停留在 backlog，目录完成度断层明显。
- `光的直线传播.docx` 已经拆成 `shadow-formation-lab`、`pinhole-imaging-lab`、`eclipse-scattering-lab` 三个产品主题，但目前只有影子页已落地。
- 高复杂度主题虽然此前被后置，但现在用户明确要求先补完初中 Word 内容，因此需要把“后置”改成“可交付的简化课堂版”。
- 新增页面如果各写一套 UI，会继续放大维护成本；需要抽一层轻量实验页脚手架，统一复用现有控制组件和主舞台视觉系统。

## Requirements Trace

- R1. `docs/archive/可视化教学/物理实验可视化/` 中剩余初中物理 Word 对应主题都要具备真实实验页。
- R2. 新增实验页必须接入 `web-app/app/routes/visualization.tsx`，并在 `web-app/app/data/teaching-catalog.ts` 中改为 `implemented`。
- R3. 页面结构保持现有课堂化体验：左侧可收缩控制面板，右侧只放可视化主舞台，必要数据以内嵌 overlay 呈现。
- R4. 每个实验页至少覆盖该 Word 的核心教学链路，而不是只放静态示意图。
- R5. 测试需要覆盖真实路由接线和每个新实验页的关键交互。
- R6. 完成后执行静态构建验证，并部署测试环境到 `https://e-teach.codelib.cc`。

## Scope Boundaries

- 本轮仅覆盖初中物理剩余 Word 主题：
  - `buoyancy-lab`
  - `pinhole-imaging-lab`
  - `eclipse-scattering-lab`
  - `lens-imaging-lab`
  - `light-refraction-lab`
  - `melting-freezing-lab`
  - `variable-resistor-lab`
- 本轮不推进高中主题实现。
- 本轮不重做已有实验页，只在必要时补共享脚手架和路由接线。
- 本轮继续保持静态站点输出，不引入 SSR。

## Context & Research

### Origin artifacts

- `docs/archive/可视化教学/物理实验可视化/力学_5_浮力与阿基米德原理.docx`
- `docs/archive/可视化教学/物理实验可视化/光学_2_光的直线传播.docx`
- `docs/archive/可视化教学/物理实验可视化/光学_1_凸透镜成像规律.docx`
- `docs/archive/可视化教学/物理实验可视化/光学_4_光的折射规律.docx`
- `docs/archive/可视化教学/物理实验可视化/热学_4_晶体与非晶体熔化凝固实验.docx`
- `docs/archive/可视化教学/物理实验可视化/电学_3_滑动变阻器动态调压实验.docx`

### Existing patterns to follow

- `web-app/app/components/shadow-formation-lab.tsx`：适合复用到几何光学与拆步骤观察型页面。
- `web-app/app/components/plane-mirror-lab.tsx`：适合复用到光路、对称、几何关系型舞台。
- `web-app/app/components/ohms-law-lab.tsx`：适合复用到电学图表 + 电路舞台 + 分步记录。
- `web-app/app/components/evaporation-rate-lab.tsx`：适合复用到时间推进与曲线联动实验。
- `web-app/app/components/control-panel-section.tsx`
- `web-app/app/components/control-chip-group.tsx`
- `web-app/app/components/control-range.tsx`
- `web-app/app/components/control-step-group.tsx`
- `web-app/app/components/control-status-bar.tsx`
- `web-app/app/components/basic-force-record-table.tsx`
- `web-app/app/routes/visualization.tsx`
- `web-app/app/routes/visualization.test.tsx`

### Institutional learnings

- `docs/solutions/2026-07-24-sliding-friction-classroom-layering.md`
  - 主流程必须压过播放器心智。
  - 首屏优先器材、现象、读数和记录，不堆过多解释块。
  - 高级控制和拓展现象要后退一层。

### External research

- 无需额外外部资料。当前工作以仓库内 Word 归档和既有实现模式为主。

## Key Technical Decisions

- **新增轻量实验页脚手架，而不是继续复制粘贴整页结构**：把左侧折叠面板、右侧主舞台、全屏按钮、panel storage 等公共结构抽成共享组件，供本轮新增 7 个页面复用。
- **每个主题只做课堂主链路，不追求一次吃满所有扩展现象**：
  - 浮力页先覆盖“浸入、浸没、深度无关、换液体、排液验证”；
  - 小孔页先覆盖“物距、像距、小孔直径、倒立实像”；
  - 日食月食/光路页先覆盖“日食、月食、烟雾散射/激光可见”三种场景切换；
  - 凸透镜页先覆盖典型物距区间和实像/虚像切换；
  - 折射页先覆盖“空气→水、空气→玻璃、水→空气、垂直入射、可逆、全反射临界”；
  - 熔化凝固页先覆盖“晶体/非晶体 + 加热/冷却 + 温度曲线”；
  - 滑动变阻器页先覆盖“滑片拖动、电表示数、灯泡亮度、保护电路、接法判断”。
- **保留“简化课堂版”定位**：此前被标为高复杂度的主题，此轮不做复杂 3D 或多页专题拆分，只做能课堂讲清的第一版。
- **把 `eclipse-scattering-lab` 从 backlog 提升为 implemented**：它已经是 `光的直线传播.docx` 的拆题产物之一，当前用户要补完剩余 Word 内容，就不能继续停留在说明壳。

## Implementation Units

- [x] **Unit 1: 建立剩余主题复用脚手架**

  **Goal:** 用一层共享组件承接新增实验页，减少后续 7 页重复结构。

  **Requirements:** R2, R3, R5

  **Files:**
  - Create: `web-app/app/components/teaching-lab-shell.tsx`
  - Create: `web-app/app/components/teaching-lab-storage.ts`
  - Modify: `web-app/app/app.css`

  **Approach:**
  - 抽出通用的折叠控制面板、标题区、滚动区、主舞台区与全屏按钮布局；
  - 统一 localStorage 读写逻辑；
  - 让新增页面主要聚焦实验状态和 SVG/图表内容。

  **Test scenarios:**
  - Happy path — 新脚手架能正常展开/收起控制面板。
  - Edge case — 浏览器无存储值时，页面默认展开。

- [x] **Unit 2: 补完光的直线传播拆题余量**

  **Goal:** 把 `pinhole-imaging-lab` 与 `eclipse-scattering-lab` 从 backlog 变成真实实验页。

  **Requirements:** R1, R2, R3, R4, R5

  **Files:**
  - Create: `web-app/app/components/pinhole-imaging-lab.tsx`
  - Create: `web-app/app/components/eclipse-scattering-lab.tsx`
  - Modify: `web-app/app/data/teaching-catalog.ts`
  - Modify: `web-app/app/routes/visualization.tsx`
  - Test: `web-app/app/components/pinhole-imaging-lab.test.tsx`
  - Test: `web-app/app/components/eclipse-scattering-lab.test.tsx`
  - Test: `web-app/app/routes/visualization.test.tsx`

  **Approach:**
  - 小孔页：物距、像距、小孔大小三参数 + 倒立实像 + 清晰度/亮度观察；
  - 天文/散射页：日食、月食、烟雾散射三场景切换，突出“三体遮挡”和“光路在介质中才可见”。

  **Verification:**
  - 从目录进入两个主题时，直接进入真实实验页而非规划壳。

- [x] **Unit 3: 补完剩余几何光学主题**

  **Goal:** 落地 `lens-imaging-lab` 与 `light-refraction-lab`。

  **Requirements:** R1, R2, R3, R4, R5

  **Files:**
  - Create: `web-app/app/components/lens-imaging-lab.tsx`
  - Create: `web-app/app/components/light-refraction-lab.tsx`
  - Modify: `web-app/app/data/teaching-catalog.ts`
  - Modify: `web-app/app/routes/visualization.tsx`
  - Test: `web-app/app/components/lens-imaging-lab.test.tsx`
  - Test: `web-app/app/components/light-refraction-lab.test.tsx`
  - Test: `web-app/app/routes/visualization.test.tsx`

  **Approach:**
  - 凸透镜页用主光轴/焦点/光屏/像的联动讲清典型区间；
  - 折射页用双介质边界、法线、光线拖拽和“生活场景补充卡”讲清偏折、可逆和全反射。

- [x] **Unit 4: 补完浮力、热学和电学剩余主题**

  **Goal:** 落地 `buoyancy-lab`、`melting-freezing-lab`、`variable-resistor-lab`。

  **Requirements:** R1, R2, R3, R4, R5

  **Files:**
  - Create: `web-app/app/components/buoyancy-lab.tsx`
  - Create: `web-app/app/components/melting-freezing-lab.tsx`
  - Create: `web-app/app/components/variable-resistor-lab.tsx`
  - Modify: `web-app/app/data/teaching-catalog.ts`
  - Modify: `web-app/app/routes/visualization.tsx`
  - Test: `web-app/app/components/buoyancy-lab.test.tsx`
  - Test: `web-app/app/components/melting-freezing-lab.test.tsx`
  - Test: `web-app/app/components/variable-resistor-lab.test.tsx`
  - Test: `web-app/app/routes/visualization.test.tsx`

  **Approach:**
  - 浮力页：浸入深度、液体密度、排液/测力计双验证；
  - 熔化凝固页：材料切换、加热/冷却切换、曲线平台对比；
  - 滑变页：接线方式、滑片位置、灯泡亮度与电表读数联动。

- [x] **Unit 5: 完成统一验证、提交推送与测试环境部署**

  **Goal:** 确保新页面全部可构建、可测试、可部署，并推到 `main`。

  **Requirements:** R5, R6

  **Files:**
  - Modify: `web-app/app/routes/visualization.test.tsx`
  - Modify: `web-app/app/data/teaching-catalog.ts`
  - Modify: `deploy/version.json`（若脚本自动生成）

  **Verification:**
  - `npm --prefix web-app run test`
  - `npm --prefix web-app run build`
  - `./scripts/deploy-testing.sh`

## Success Metrics

- 初中物理剩余 Word-backed 主题在目录中全部可直接进入真实实验页。
- `visualization` 路由不再把上述主题落到规划壳。
- 每个新实验页都具备至少一条清晰的课堂主实验链路。
- `web-app` 仍能通过现有 Vitest 与静态构建验证。
- 测试环境成功更新到最新版本。
