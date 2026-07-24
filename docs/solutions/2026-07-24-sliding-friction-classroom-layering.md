---
title: solution: Sliding friction page should prioritize classroom flow over player controls
date: 2026-07-24
topic: sliding-friction-lab
status: completed
---

# 滑动摩擦力页面应让课堂主流程压过播放器心智

## 背景

在 `web-app/app/components/basic-force-lab.tsx` 的连续几轮调整里，最容易反复回退的问题不是物理公式本身，而是页面会不自觉长成“播放器”：

- 顶部步骤条可直接跳阶段
- 说明、徽标、进度、状态同时抢首屏
- 记录区只像数据回显，不像课堂实验单
- 扩展观察和课堂主操作并列，导致注意力被功能切碎

这会让用户先学会“操作页面”，再去理解“完成实验”。

## 最终做法

这次对摩擦力实验页采用了三条固定规则：

1. **只保留一个统一界面**
   - 不做学生/教师双角色
   - 通过 `主流程 / 辅助操作 / 扩展观察` 分层解决复杂度

2. **让 2D 主舞台先看器材和读数**
   - 顶部步骤条改成只读进度提示
   - 当前任务摘要独立成轻量 overlay
   - 公式和原理不再首屏完整出现

3. **让记录区变成实验单**
   - 不只展示已记录行
   - 必须保留待测行、当前组、下一组建议、分层结论

## 为什么这样更适合课堂

课堂实验页和普通模拟器不一样。

课堂里真正要保护的是这条链路：

`选变量 -> 观察 -> 读数稳定 -> 记录本组 -> 补完对照 -> 归纳结论`

只要页面让“跳步骤”“看结论”“切模式”比这条链路更显眼，用户就会绕开实验本身。

所以这类页面里：

- **主流程必须最短**
- **高级控制必须后退一层**
- **结论必须比记录更晚出现**
- **实验单必须比炫技 UI 更重要**

## 可复用判断标准

以后做其他实验页时，可以先问四个问题：

1. 首屏最显眼的是器材/任务，还是按钮/模式？
2. 用户是否能在不理解页面全部功能的前提下，先完成第一组实验？
3. 页面是在“帮用户记录和对照”，还是在“展示系统已经知道答案”？
4. 如果把扩展功能全部折叠，主流程是否仍然完整清楚？

只要前两个答案是否定，或者后两个答案是否定，这个页面大概率又回到了播放器心智。

## 本次落地位置

- `web-app/app/components/basic-force-lab.tsx`
- `web-app/app/components/basic-force-classroom-summary.tsx`
- `web-app/app/components/basic-force-record-table.tsx`
- `web-app/app/components/basic-force-lab-teaching.ts`
- `web-app/app/app.css`
