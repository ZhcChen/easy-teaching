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
  return (
    <StageSelectionView
      eyebrow="知识库入口"
      title="先进入学段，再继续定位到具体知识点"
      description="知识库页与首页共用同一条选择路径，但这里更强调按内容目录进入。学段之后进入学科页，再进入知识点页。"
    />
  );
}
