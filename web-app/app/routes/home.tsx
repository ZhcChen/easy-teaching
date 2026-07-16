import { StageSelectionView } from "../components/stage-selection-view";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "可视化教学 · 首页" },
    {
      name: "description",
      content: "可视化教学 Web App 基座，面向 PC 与 H5，采用本地优先的数据策略。",
    },
  ];
}

export default function Home() {
  return (
    <StageSelectionView
      eyebrow="可视化教学 Web App"
      title="先选学段，再逐页进入学科和知识点"
      description="当前先以 PC 为核心完成主流程，H5 同步适配。首页只承担学段选择，不再把全部层级堆在同一个页面。"
    />
  );
}
