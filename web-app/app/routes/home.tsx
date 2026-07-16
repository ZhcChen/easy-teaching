import { CatalogWorkbench } from "../components/catalog-workbench";
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
    <CatalogWorkbench
      eyebrow="PC 首页"
      title="先选学段，再进学科，最后直接打开知识点"
      description="首页直接做成卡片式入口，不绕复杂信息架构。当前先验证 PC 主体验：选学段、选学科、点知识点进入可视化页面，整体保持科技风格但尽量简约。"
    />
  );
}
