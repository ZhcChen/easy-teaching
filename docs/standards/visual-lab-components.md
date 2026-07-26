---
title: 可视化实验页组件规范
type: standard
status: active
date: 2026-07-26
---

# 可视化实验页组件规范

> 本文档定义可视化实验页的组件职责和使用边界。
> 页面级规则以 `docs/standards/visual-lab-page-spec.md` 为准。

## 1. 组件规范目标

组件规范的核心不是“列出组件名”，而是回答：

- 哪类信息该用哪类组件承载
- 哪些组件可以跨知识点稳定复用
- 哪些样式变化属于主题变化，哪些不应该每页各写一套

## 2. 左侧控制区组件

### 2.1 `ControlPanelSection`

用途：

- 左侧控制面板的一级分组容器

适合放：

- 实验控制
- 模式切换
- 核心参数
- 显示项
- 思考提示

不适合放：

- 大段课堂讲义
- 需要持续观看的主结果

要求：

- 每个 section 只承担一个清晰职责
- section 标题短而直观
- 一个页面内 section 数量默认控制在 3 到 5 组

### 2.2 `ControlStatusBar`

用途：

- 在 section 顶部表达“当前模式 + 当前状态”

适合放：

- 当前实验模式
- 当前时间段
- 当前状态标签

要求：

- 只显示摘要，不展开长说明
- 文字必须能被一眼扫读

### 2.3 `StatusPill`

用途：

- 表达状态、模式、标签

适合放：

- 匀速 / 加速 / 减速
- 待释放 / 演示中 / 已完成
- 当前表面 / 当前场景

要求：

- 文案短
- 状态色统一，不在单页中自创新语义色

## 3. 交互控件组件

### 3.1 `ControlButton`

用途：

- 所有主要按钮交互

语义约定：

- `primary`：本轮最重要动作，如开始播放、开始实验、记录本组
- 默认 / `ghost`：次级动作，如重置、更新本组、切换辅助行为

要求：

- 一个操作组里只允许一个主按钮
- “重置”默认是次级，不应与主播放按钮抢视觉权重

### 3.2 `ControlRange`

用途：

- 连续型参数

适合放：

- 时间轴
- 初速度
- 加速度
- 演示时长
- 角度、距离、强度等连续变量

要求：

- 默认支持数值直接输入时，要保证输入和拖动语义一致
- `label / value / unit` 要同时清楚
- 不要把离散枚举参数强行做成 range

### 3.3 `ControlChipGroup`

用途：

- 离散枚举型参数

适合放：

- 运动模式
- 表面材质
- 电路连接方式
- 开关、视图显示项
- 倍速档位

要求：

- 同一组内语义平级
- 选中态统一
- 不要把长段解释塞进 chip 本体

## 4. 主舞台组件

### 4.1 `VisualModeSwitch`

用途：

- 2D / 3D 或其他同级视图切换

要求：

- 固定悬浮在主舞台左上角
- 宽度尽量小
- 只切视图，不切业务状态

不应承担：

- 模式说明文档
- 二级筛选器

### 4.2 `FullscreenToggleButton`

用途：

- 放大主舞台，提升观察体验

要求：

- 固定在主舞台右上角
- 样式轻量，不抢主可视化
- 统一复用共享组件，不在每个实验页内联重复写按钮和图标
- 只处理“进入 / 退出全屏”这一件事，不夹带其他业务状态

推荐接口：

- `isFullscreen`
- `onToggle`
- `variant`（如 `floating` / `compact`）

### 4.3 HUD / Overlay

用途：

- 展示舞台内必要状态

推荐类型：

- 顶部轻量 HUD
- 底部 summary bar
- 小型角标数值

要求：

- 永远服务于“更好看懂主舞台”
- 信息密度必须低于左侧控制区
- 不遮挡主对象运动路径

## 5. 图表和辅助信息组件

### 5.1 图表

适合：

- 有趋势变化、对照观察、定量推导价值的实验

不强制：

- 不是每个实验都必须有图表

要求：

- 图表是辅助层，不应压过主舞台
- 图表标题要明确说明观察目的

### 5.2 summary bar

适合：

- 当前进度
- 当前关键数值
- 当前结论摘要

要求：

- 短、稳、横向扫读
- 放底部优先

### 5.3 对照卡片 / 记录卡片

适合：

- 多轮实验对照
- 小组记录
- 课堂归纳

要求：

- 放左侧控制区或舞台的次级信息层
- 不要默认侵入主舞台中心

## 6. 组件使用顺序建议

新实验页默认按以下顺序选择组件：

1. 先用 `ControlPanelSection` 划分左侧结构
2. 再决定每组里是 `ControlRange` 还是 `ControlChipGroup`
3. 再用 `ControlButton` 定义动作层级
4. 再决定主舞台是否需要 `VisualModeSwitch`
5. 最后补 `StatusPill`、HUD、summary bar 等辅助表达

## 7. 不允许的组件层面反模式

1. 同一语义页面出现两套按钮风格
2. 同一类参数在不同页面换一套控件写法
3. chip、pill、button 的选中态语义不一致
4. 主舞台提示块尺寸过大，演变成第二个控制面板
5. 为单页微小差异复制一套新组件而不复用现有组件

## 8. 参考组件来源

当前可视化实验页通用组件主要来源于：

- `web-app/app/components/control-button.tsx`
- `web-app/app/components/control-range.tsx`
- `web-app/app/components/control-chip-group.tsx`
- `web-app/app/components/control-panel-section.tsx`
- `web-app/app/components/control-status-bar.tsx`
- `web-app/app/components/status-pill.tsx`
- `web-app/app/components/visual-mode-switch.tsx`
后续新增实验页，优先在这些组件上扩展，不优先新增平行组件。
