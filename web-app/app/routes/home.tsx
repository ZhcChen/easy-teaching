import { StageSelectionView } from "../components/stage-selection-view";
import { useDocumentMeta, useLocale } from "../i18n";
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
  const { tt } = useLocale();

  useDocumentMeta({
    title: `${tt("可视化教学")} · ${tt("首页")}`,
    description: tt("可视化教学 Web App 基座，面向 PC 与 H5，采用本地优先的数据策略。"),
  });

  return <StageSelectionView />;
}
