import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router";

import { BasicForceLab } from "../components/basic-force-lab";
import { CircuitObserverLab } from "../components/circuit-observer-lab";
import { MotionTrackLab } from "../components/motion-track-lab";
import { StatusPanel } from "../components/status-panel";
import { useDocumentMeta, useLocale } from "../i18n";
import { getTopicById, type TeachingTopic } from "../data/teaching-catalog";
import type { Route } from "./+types/visualization";

export function meta({ params }: Route.MetaArgs) {
  const topicData = getTopicById(params.topicId ?? "");

  return [
    {
      title: topicData
        ? `可视化页面 · ${topicData.topic.title}`
        : "可视化页面",
    },
    {
      name: "description",
      content: topicData
        ? `${topicData.topic.title} 的科技简约风可视化页面。`
        : "可视化页面预览。",
    },
  ];
}

export default function VisualizationPage({ params }: Route.ComponentProps) {
  const { tt } = useLocale();
  const topicData = getTopicById(params.topicId ?? "");
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useDocumentMeta({
    title: topicData
      ? `${tt("可视化页面")} · ${tt(topicData.topic.title)}`
      : tt("可视化页面"),
    description: topicData
      ? `${tt(topicData.topic.title)} · ${tt("可视化页面预览。")}`
      : tt("可视化页面预览。"),
  });

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === fullscreenRef.current);
    }

    async function handleKeydown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (document.fullscreenElement === fullscreenRef.current) {
        await document.exitFullscreen();
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  async function toggleFullscreen() {
    const target = fullscreenRef.current;
    if (!target) {
      return;
    }

    if (document.fullscreenElement === target) {
      await document.exitFullscreen();
      return;
    }

    await target.requestFullscreen();
  }

  if (!topicData) {
    return (
      <StatusPanel
        eyebrow={tt("未找到知识点")}
        title={tt("这个可视化页面还没有准备好")}
        description={tt("当前路由没有匹配到知识点数据。你可以先返回首页或知识库重新选择。")}
        tone="danger"
        actions={
          <>
            <Link to="/" className="action-link is-primary">
              {tt("返回首页")}
            </Link>
            <Link to="/content" className="action-link">
              {tt("打开知识库")}
            </Link>
          </>
        }
      />
    );
  }

  const { stage, subject, topic } = topicData;
  const isImmersiveLab =
    topic.id === "basic-force" ||
    topic.id === "motion-track" ||
    topic.id === "circuit-observer";

  return (
    <div className="page-stack visual-page">
      {topic.id === "basic-force" ? (
        <BasicForceLab
          topic={topic}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          fullscreenRef={fullscreenRef}
        />
      ) : topic.id === "circuit-observer" ? (
        <CircuitObserverLab
          topic={topic}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          fullscreenRef={fullscreenRef}
        />
      ) : topic.id === "motion-track" ? (
        <MotionTrackLab
          topic={topic}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          fullscreenRef={fullscreenRef}
        />
      ) : (
        <DefaultVisualizationShell
          topic={topic}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          fullscreenRef={fullscreenRef}
        />
      )}

      {isImmersiveLab ? null : (
        <div className="action-row">
          <Link to={`/content/${stage.id}/${subject.id}`} className="action-link is-primary">
            {tt("返回知识点页")}
          </Link>
          <Link to={`/content/${stage.id}`} className="action-link">
            {tt("返回学科页")}
          </Link>
        </div>
      )}
    </div>
  );
}

type DefaultVisualizationShellProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

function DefaultVisualizationShell({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: DefaultVisualizationShellProps) {
  const { tt } = useLocale();

  return (
    <section ref={fullscreenRef} className="visual-shell">
      <div className="visual-canvas">
        <button
          type="button"
          onClick={() => {
            void onToggleFullscreen();
          }}
          className="fullscreen-button is-floating"
          aria-label={isFullscreen ? tt("退出全屏") : tt("进入全屏")}
          title={isFullscreen ? tt("退出全屏") : tt("进入全屏")}
        >
          {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
        </button>
        <div className="visual-grid-layer" />
        <div className="visual-glow visual-glow-a" />
        <div className="visual-glow visual-glow-b" />
        <div className="visual-line visual-line-a" />
        <div className="visual-line visual-line-b" />

        <div className="visual-canvas-inner">
          <div className="visual-metric-grid">
            {sceneMetrics.map((metric) => (
              <article key={metric.label} className="visual-metric-card">
                <p className="surface-eyebrow">{tt(metric.label)}</p>
                <p className="visual-metric-value">{tt(metric.value)}</p>
                <p className="visual-metric-copy">{tt(metric.detail)}</p>
              </article>
            ))}
          </div>

          <div className="visual-centerpiece">
            <div className="visual-orbit visual-orbit-lg" />
            <div className="visual-orbit visual-orbit-md" />
            <div className="visual-core" />
            <div className="floating-note floating-note-a">
              {tt("参数层")}
            </div>
            <div className="floating-note floating-note-b">
              {tt("结论层")}
            </div>
            <div className="floating-note floating-note-c">
              {tt("图形层")}
            </div>
            <div className="floating-note floating-note-d">
              {tt("状态层")}
            </div>
            <div className="visual-centerpiece-spacer" />
          </div>

          <div className="visual-detail-grid">
            {topic.highlights.map((item) => (
              <article key={item} className="visual-detail-card">
                <p>{tt(item)}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ExpandIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
      <path d="M8 4H4v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 4h4v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 16v4h-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v4h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 9L4 4" strokeLinecap="round" />
      <path d="M15 9l5-5" strokeLinecap="round" />
      <path d="M9 15l-5 5" strokeLinecap="round" />
      <path d="M15 15l5 5" strokeLinecap="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
      <path d="M9 4H4v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 4h5v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v5h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9l5-5" strokeLinecap="round" />
      <path d="M20 9l-5-5" strokeLinecap="round" />
      <path d="M4 15l5 5" strokeLinecap="round" />
      <path d="M20 15l-5 5" strokeLinecap="round" />
    </svg>
  );
}

const sceneMetrics = [
  {
    label: "页面状态",
    value: "科技简约",
    detail: "当前先验证页面气质和进入流程，不急着堆过多控件。",
  },
  {
    label: "全屏能力",
    value: "已支持",
    detail: "点击右上角图标进入或退出全屏，按 Esc 也能退出。",
  },
  {
    label: "后续接入",
    value: "2D / 3D",
    detail: "当前是静态科技画布，后面逐步替换为真实可视化引擎。",
  },
];
