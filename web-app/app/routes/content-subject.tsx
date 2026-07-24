import { Link } from "react-router";

import { StatusPanel } from "../components/status-panel";
import { useDocumentMeta, useLocale } from "../i18n";
import { getSubjectByStageAndId } from "../data/teaching-catalog";
import type { Route } from "./+types/content-subject";

export function meta({ params }: Route.MetaArgs) {
  const data = getSubjectByStageAndId(params.stageId ?? "", params.subjectId ?? "");

  return [
    {
      title: data
        ? `可视化教学 · ${data.stage.label}${data.subject.label}知识点`
        : "可视化教学 · 知识点选择",
    },
    {
      name: "description",
      content: data
        ? `${data.stage.label} ${data.subject.label} 的知识点选择页。`
        : "知识点选择页。",
    },
  ];
}

export default function ContentSubjectPage({ params }: Route.ComponentProps) {
  const { tt } = useLocale();
  const data = getSubjectByStageAndId(params.stageId ?? "", params.subjectId ?? "");

  useDocumentMeta({
    title: data
      ? `${tt("可视化教学")} · ${tt(data.stage.label)} ${tt(data.subject.label)}`
      : `${tt("可视化教学")} · ${tt("知识点")}`,
    description: data
      ? `${tt(data.stage.label)} · ${tt(data.subject.label)}`
      : tt("知识点"),
  });

  if (!data) {
    return (
      <StatusPanel
        eyebrow={tt("未找到学科")}
        title={tt("这个学科入口不存在")}
        description={tt("当前路径没有匹配到学科数据，请先返回学段页重新选择。")}
        tone="danger"
        actions={
          <>
            <Link to="/content" className="action-link is-primary">
              {tt("知识库")}
            </Link>
            <Link to="/" className="action-link">
              {tt("返回首页")}
            </Link>
          </>
        }
      />
    );
  }

  const { stage, subject } = data;

  return (
    <div className="page-stack">
      <nav className="breadcrumb subject-topic-breadcrumb" aria-label={tt("面包屑")}>
        <Link to="/" className="breadcrumb-link">
          {tt("首页")}
        </Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/content" className="breadcrumb-link">
          {tt("知识库")}
        </Link>
        <span className="breadcrumb-separator">/</span>
        <Link to={`/content/${stage.id}`} className="breadcrumb-link">
          {tt(stage.label)}
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{tt(subject.label)}</span>
      </nav>

      <section className="content-flow-section">
        <div className="entry-grid entry-grid-topic">
          {subject.topics.map((topic) => {
            const modeClass = getTopicModeClass(topic.mode);
            const themeClass = getTopicThemeClass(topic.id);
            const modeBadges = getTopicModeBadges(topic.mode);

            return (
              <Link
                key={topic.id}
                to={`/visual/${topic.id}`}
                className={`entry-card entry-card-topic topic-tech-card ${modeClass} ${themeClass}`}
              >
                <div className="topic-tech-grid" aria-hidden="true" />
                <div className="topic-tech-orbits" aria-hidden="true">
                  <span className="topic-tech-orbit topic-tech-orbit-lg" />
                  <span className="topic-tech-orbit topic-tech-orbit-md" />
                  <span className="topic-tech-core" />
                </div>

                <div className="entry-card-top topic-tech-top">
                  <div className="entry-card-badges">
                    {modeBadges.map((badge) => (
                      <span key={badge.label} className={`entry-badge${badge.soft ? " is-soft" : ""}`}>
                        {tt(badge.label)}
                      </span>
                    ))}
                  </div>
                  <span className="entry-card-arrow">{tt("进入页面")}</span>
                </div>

                <div className="entry-card-body topic-tech-body">
                  <h3 className="entry-card-title">{tt(topic.title)}</h3>
                </div>

                <div className="topic-tech-tags">
                  {topic.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="topic-tech-tag">
                      {tt(tag)}
                    </span>
                  ))}
                  {topic.highlights.slice(0, 1).map((item) => (
                    <span key={item} className="topic-tech-tag is-muted">
                      {tt(item)}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function getTopicModeClass(mode: string) {
  if (mode === "3D") {
    return "is-3d";
  }

  if (mode === "2D / 3D") {
    return "is-hybrid";
  }

  return "is-2d";
}

function getTopicModeBadges(mode: string) {
  if (mode === "2D / 3D") {
    return [
      { label: "2D", soft: false },
      { label: "3D", soft: true },
    ];
  }

  return [{ label: mode, soft: false }];
}

function getTopicThemeClass(topicId: string) {
  if (topicId === "motion-track") {
    return "is-motion";
  }

  if (topicId === "sliding-friction-lab" || topicId === "basic-force") {
    return "is-force";
  }

  if (topicId === "circuit-observer") {
    return "is-circuit";
  }

  return "";
}
