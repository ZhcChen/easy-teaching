import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { BasicForceLab } from "../components/basic-force-lab";
import { CircuitObserverLab } from "../components/circuit-observer-lab";
import { MotionTrackLab } from "../components/motion-track-lab";
import { NewtonFirstLawLab } from "../components/newton-first-law-lab";
import { PressureFactorsLab } from "../components/pressure-factors-lab";
import { StatusPanel } from "../components/status-panel";
import { useDocumentMeta, useLocale } from "../i18n";
import {
  getTopicDeliveryMeta,
  getTopicById,
  isImplementedTopicId,
  isSlidingFrictionTopicId,
  type TeachingTopic,
} from "../data/teaching-catalog";
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
  const isImmersiveLab = isImplementedTopicId(topic.id);

  return (
    <div className="page-stack visual-page">
      {isSlidingFrictionTopicId(topic.id) ? (
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
      ) : topic.id === "newton-first-law-lab" ? (
        <NewtonFirstLawLab
          topic={topic}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          fullscreenRef={fullscreenRef}
        />
      ) : topic.id === "pressure-factors-lab" ? (
        <PressureFactorsLab
          topic={topic}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          fullscreenRef={fullscreenRef}
        />
      ) : (
        <TopicPlanningShell
          topic={topic}
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

type TopicPlanningShellProps = {
  topic: TeachingTopic;
};

function TopicPlanningShell({ topic }: TopicPlanningShellProps) {
  const { tt } = useLocale();
  const deliveryMeta = getTopicDeliveryMeta(topic);
  const isPlanned = topic.deliveryState === "planned";
  const showPriorityTag = topic.status !== deliveryMeta.label;

  return (
    <div className="visual-planning-stack">
      <StatusPanel
        eyebrow={tt(deliveryMeta.label)}
        title={tt(topic.title)}
        description={tt(
          isPlanned
            ? `${topic.summary} 当前还没有真实实验页，先保留为教学规划项。`
            : `${topic.summary} 当前只保留主题方向说明，后续会结合课堂主线决定是否推进。`,
        )}
      />

      <section className="surface-panel visual-planning-details">
        <div className="visual-planning-detail-grid">
          <article className="visual-planning-detail-card">
            <p className="surface-eyebrow">{tt("当前状态")}</p>
            <h2 className="visual-planning-detail-title">{tt(deliveryMeta.label)}</h2>
            <p className="visual-planning-detail-copy">{tt(deliveryMeta.description)}</p>
          </article>

          <article className="visual-planning-detail-card">
            <p className="surface-eyebrow">{tt("适配模式")}</p>
            <h2 className="visual-planning-detail-title">{tt(topic.mode)}</h2>
            <p className="visual-planning-detail-copy">
              {tt(
                isPlanned
                  ? "这部分会在真实实验页落地时，再决定是否加入 2D、3D 或双视图。"
                  : "当前不进入演示实现，先保留方向定义，避免目录看起来已完成。",
              )}
            </p>
          </article>
        </div>

        <div className="visual-planning-tag-row">
          {showPriorityTag ? (
            <span className="topic-tech-tag is-priority">{tt(topic.status)}</span>
          ) : null}
          {topic.tags.map((tag) => (
            <span key={tag} className="topic-tech-tag">
              {tt(tag)}
            </span>
          ))}
        </div>

        <div className="visual-planning-highlight-list">
          {topic.highlights.map((item) => (
            <article key={item} className="visual-planning-highlight-card">
              <span className="topic-highlight-dot" aria-hidden="true" />
              <p>{tt(item)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
