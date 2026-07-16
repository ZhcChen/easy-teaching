import { CatalogWorkbench } from "../components/catalog-workbench";
import type { Route } from "./+types/content";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "可视化教学 · 内容" },
    {
      name: "description",
      content: "按学段、学科与章节组织可视化教学内容的一级入口。",
    },
  ];
}

export default function ContentPage() {
  return (
    <CatalogWorkbench
      eyebrow="知识库"
      title="知识点入口直接汇总到这里"
      description="知识库页延续同一套卡片入口结构，但更偏向整理全部可视化知识点。当前先和首页保持同一个交互模型，减少认知切换。"
    />
  );
}
