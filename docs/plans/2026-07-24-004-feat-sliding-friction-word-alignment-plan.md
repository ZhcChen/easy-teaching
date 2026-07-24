---
title: feat: Align sliding friction lab with source Word document
type: feat
status: completed
date: 2026-07-24
origin: docs/archive/可视化教学/物理实验可视化/力学_3_滑动摩擦力影响因素实验.docx
---

# feat: Align sliding friction lab with source Word document

## Overview

重新以 `docs/archive/可视化教学/物理实验可视化/力学_3_滑动摩擦力影响因素实验.docx` 为事实基准，补齐当前滑动摩擦力实验页仍未体现的课堂元素，同时保持前几轮已经确立的“主流程优先、辅助操作下沉、右侧以可视化为主”的页面策略。

## Problem Frame

当前 `web-app/app/components/basic-force-lab.tsx` 已经具备课堂主流程、分层结论、记录实验单和 2D / 3D 场景，但和 Word 原始文档逐项对照后，仍有几处明显缺口：

- Word 中的“实验器材”尚未在页面中落地，课堂进入前缺少器材语义；
- Word 强调的“多组对比柱状图 / 折线图”在教学测量模式下尚未体现，当前只有实验单，没有更直观的对照图；
- Word 中的“探究思考题”还没有转成课堂引导内容；
- Word 的接触面积交互说明包含“正放 / 侧放 / 竖放”，当前主流程只保留了课堂默认对照，扩展观察项没有回填。

这些缺口不会推翻现有架构，但会让页面仍然偏“能用的实验页”，而不是更完整的“对齐原始教案的课堂实验页”。

## Requirements Trace

- R1. 页面需要补上 Word 中的实验器材信息，但呈现必须轻量，不打断主流程。
- R2. 教学测量模式下需要出现多组对照图，帮助用户直观看到“当前组 / 已记录组 / 待测组”的差异。
- R3. 对照图不能提前泄露所有答案，应优先展示已记录结果与当前观测进度，而不是直接给出完整标准值。
- R4. 页面需要补上 Word 中的思考引导，但应放在左侧控制面板中，以课堂提示的形式出现。
- R5. 接触面积相关交互需要补回 `竖放` 这一扩展观察项，但不能破坏课堂默认只统计 `正放 / 侧放` 的实验单逻辑。
- R6. 本轮调整不能重新把右侧可视化区域变成信息堆叠区，新增信息应尽量压缩在既有区域或左侧面板中。

## Scope Boundaries

- 不新增新的知识点页面，只继续完善滑动摩擦力实验页。
- 不重构 Three.js / 2D 渲染主干。
- 不引入后端、云同步、权限或账号能力。
- 不把 Word 中的示例摩擦力数值直接当作页面默认答案展示。

## Context & Research

### Relevant Code and Patterns

- `web-app/app/components/basic-force-lab.tsx`：当前滑动摩擦力实验页主实现。
- `web-app/app/components/basic-force-record-table.tsx`：课堂实验单列表，可继续复用 HTML + 样式化分组的呈现方式。
- `web-app/app/components/basic-force-lab-state.ts`：课堂分组、候选组与接触面积默认对照逻辑，扩展 `竖放` 时不能破坏这里的课堂候选组判断。
- `web-app/app/components/basic-force-lab.test.tsx`：已有课堂主流程测试。

### Institutional Learnings

- `docs/solutions/2026-07-24-sliding-friction-classroom-layering.md` 已明确：课堂实验页要优先保护“选变量 -> 观察 -> 稳定 -> 记录 -> 对照 -> 归纳”，新增内容不能重新压过主流程。

### External References

- 无。当前仓库已有足够的本地模式和原始 Word 文档可作为依据。

## Key Technical Decisions

- 用“轻量支持信息 + 可视化内嵌对照图”的方式补齐 Word 缺口，而不是在右侧额外新增大块说明区。
- 多组对照图采用当前测量值 / 已记录值驱动的柱状对比，不直接预填完整标准答案，保持课堂探究顺序。
- `竖放` 回到交互层，但继续作为扩展观察项，不进入课堂默认实验单统计。
- 思考题采用动态课堂提示，跟随当前研究因素切换，避免左侧面板出现大段静态文本。

## Open Questions

### Resolved During Planning

- 是否需要把 Word 中的全部说明都搬到右侧可视化区域？否。继续遵守现有交互原则，右侧只补与可视化强相关的对照图。
- `竖放` 是否进入课堂实验单默认对照？否。保留为扩展观察，课堂记录仍只统计 `正放 / 侧放`。

### Deferred to Implementation

- 对照图使用纯 SVG 还是 `foreignObject` + HTML 条形卡片，需结合当前 2D 舞台可用高度实际微调。
- 思考提示具体展示 3 条还是 4 条，允许在实现时按布局压缩，但需覆盖 Word 的核心提问方向。

## Implementation Units

- [x] **Unit 1: 补齐 Word 来源的左侧教学支持信息**

**Goal:** 在不破坏当前主流程的前提下，补充实验器材与课堂思考提示。

**Requirements:** R1, R4, R6

**Dependencies:** None

**Files:**
- Modify: `web-app/app/components/basic-force-lab.tsx`
- Modify: `web-app/app/app.css`
- Test: `web-app/app/components/basic-force-lab.test.tsx`

**Approach:**
- 在左侧控制面板增加轻量“实验器材”区块；
- 增加“思考提示”区块，并基于当前研究因素动态切换问题；
- 保持现有主流程、辅助操作、扩展观察的层级不变。

**Patterns to follow:**
- `web-app/app/components/basic-force-record-table.tsx`
- `web-app/app/components/basic-force-lab.tsx` 中现有 `ControlPanelSection` 用法

**Test scenarios:**
- Happy path — 首次进入页面时可看到实验器材区块与至少一个课堂思考提示。
- Happy path — 切换研究因素后，思考提示同步切换到对应问题方向。
- Edge case — 在面板收起再展开后，新增教学支持区仍正常显示。

**Verification:**
- 左侧面板能补足 Word 的器材与思考要点，同时不明显拉高首屏认知负担。

- [x] **Unit 2: 在教学测量模式中加入多组对照图**

**Goal:** 让 2D 教学测量模式符合 Word 的“数据汇总 / 多组对比柱状图”要求。

**Requirements:** R2, R3, R6

**Dependencies:** Unit 1

**Files:**
- Create: `web-app/app/components/basic-force-comparison-chart.tsx`
- Modify: `web-app/app/components/basic-force-lab.tsx`
- Modify: `web-app/app/app.css`
- Test: `web-app/app/components/basic-force-lab.test.tsx`

**Approach:**
- 新增一个可复用的课堂对照图组件；
- 数据来源优先使用已记录组，当前正在测量的组可展示实时或稳定读数，其余待测组只显示占位态；
- 将该组件嵌入教学测量模式的既有下半区，避免额外新增右侧信息容器。

**Patterns to follow:**
- `web-app/app/components/basic-force-record-table.tsx`
- `web-app/app/components/basic-force-lab.tsx` 中现有 `foreignObject` 嵌入 HTML 卡片的方式

**Test scenarios:**
- Happy path — 首次进入页面时，对照图展示当前研究因素的分组标签与待测状态。
- Happy path — 记录一组后，对照图中对应分组变为已记录值。
- Edge case — 切换研究因素后，对照图同步切换为新的分组集合。
- Integration — 当前组进入稳定读数阶段但未记录时，对照图能显示当前观测进度而不写入实验单。

**Verification:**
- 用户在教学测量模式下，既能看实验单，也能更直观地看到本因素多组对照进度。

- [x] **Unit 3: 补回接触面积扩展观察项并校准课堂提示**

**Goal:** 让接触面积交互重新覆盖 Word 中的 `正放 / 侧放 / 竖放`，同时保住课堂默认统计边界。

**Requirements:** R5, R6

**Dependencies:** Unit 1

**Files:**
- Modify: `web-app/app/components/basic-force-lab.tsx`
- Modify: `web-app/app/components/basic-force-lab-teaching.ts`
- Test: `web-app/app/components/basic-force-lab.test.tsx`

**Approach:**
- 在接触面积控制中恢复 `竖放` 选项；
- 保持 `basic-force-lab-state.ts` 的课堂候选组为 `正放 / 侧放`；
- 当选择 `竖放` 时，沿用现有“扩展观察 / 不写入课堂记录”提示链路。

**Patterns to follow:**
- `web-app/app/components/basic-force-lab-state.ts` 中现有 `isClassroomCandidateForFactor` 逻辑
- `web-app/app/components/basic-force-lab.tsx` 中现有扩展观察提示文案

**Test scenarios:**
- Happy path — 接触面积研究因素下可看到 `竖放` 选项。
- Integration — 切换到 `竖放` 后，页面进入扩展观察提示，且课堂记录按钮不可写入当前组。
- Edge case — 从 `竖放` 切回 `正放` / `侧放` 后，课堂主流程提示恢复正常。

**Verification:**
- 接触面积交互与 Word 更一致，但课堂实验单仍只围绕默认控制变量组展开。

## System-Wide Impact

- **Interaction graph:** 主要影响 `BasicForceLab` 的左侧面板内容、教学测量模式下的 2D 下半区，以及课堂候选组判断提示链路。
- **State lifecycle risks:** `竖放` 回归后，必须保持非课堂候选组不会误写入实验单。
- **Integration coverage:** 需要覆盖“稳定但未记录”“已记录”“非课堂候选组”三类状态在对照图和提示中的联动。
- **Unchanged invariants:** 现有 2D / 3D 切换、主流程 / 辅助操作 / 扩展观察分层、课堂实验单分层结论机制不变。

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 新增对照图导致 2D 下半区再次拥挤 | 采用紧凑条形图，并优先压缩左卡说明文字长度 |
| `竖放` 回归后误导用户进入课堂记录 | 继续依赖 `isClassroomCandidate` 判定，并补测试覆盖 |
| 思考提示文案过多导致左侧面板冗长 | 只保留最核心的动态课堂提问，控制单条长度 |

## Documentation / Operational Notes

- 本轮以源 Word 文档为准完成一次事实校对，后续若继续优化摩擦力页，应优先复用本计划与原文档，不再凭感觉增删教学内容。

## Sources & References

- **Origin document:** `docs/archive/可视化教学/物理实验可视化/力学_3_滑动摩擦力影响因素实验.docx`
- Related code: `web-app/app/components/basic-force-lab.tsx`
- Related code: `web-app/app/components/basic-force-lab-state.ts`
- Institutional learning: `docs/solutions/2026-07-24-sliding-friction-classroom-layering.md`
