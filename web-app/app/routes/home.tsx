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
  return <StageSelectionView />;
}
