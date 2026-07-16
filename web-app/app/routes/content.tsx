import { StageSelectionView } from "../components/stage-selection-view";
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
  return <StageSelectionView />;
}
