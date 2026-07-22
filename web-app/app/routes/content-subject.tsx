import { Link } from "react-router";

import { StatusPanel } from "../components/status-panel";
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
  const data = getSubjectByStageAndId(params.stageId ?? "", params.subjectId ?? "");

  if (!data) {
    return (
      <StatusPanel
        eyebrow="未找到学科"
        title="这个学科入口不存在"
        description="当前路径没有匹配到学科数据，请先返回学段页重新选择。"
        tone="danger"
        actions={
          <>
            <Link to="/content" className="action-link is-primary">
              返回知识库
            </Link>
            <Link to="/" className="action-link">
              返回首页
            </Link>
          </>
        }
      />
    );
  }

  const { stage, subject } = data;

  return (
    <div className="page-stack">
      <nav className="breadcrumb subject-topic-breadcrumb" aria-label="面包屑">
        <Link to="/" className="breadcrumb-link">
          首页
        </Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/content" className="breadcrumb-link">
          知识库
        </Link>
        <span className="breadcrumb-separator">/</span>
        <Link to={`/content/${stage.id}`} className="breadcrumb-link">
          {stage.label}
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{subject.label}</span>
      </nav>

      <section className="content-flow-section">
        <div className="entry-grid entry-grid-topic">
          {subject.topics.map((topic) => {
            const modeClass = getTopicModeClass(topic.mode);
            const themeClass = getTopicThemeClass(topic.id);

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
                    <span className="entry-badge">{topic.mode}</span>
                    <span className="entry-badge is-soft">{topic.status}</span>
                  </div>
                  <span className="entry-card-arrow">进入页面</span>
                </div>

                <div className="entry-card-body topic-tech-body">
                  <h3 className="entry-card-title">{topic.title}</h3>
                  <p className="entry-card-copy">{topic.summary}</p>
                  <div className="topic-tech-tags">
                    {topic.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="topic-tech-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <ul className="entry-highlight-list topic-tech-highlights">
                  {topic.highlights.slice(0, 2).map((item) => (
                    <li key={item} className="entry-highlight-item">
                      <span className="entry-highlight-dot" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="topic-tech-footer">
                  <span className="topic-tech-track">{getTopicTrack(topic.id, topic.mode)}</span>
                  <span className="topic-tech-footer-line" aria-hidden="true" />
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

function getTopicThemeClass(topicId: string) {
  if (topicId === "motion-track") {
    return "is-motion";
  }

  if (topicId === "basic-force") {
    return "is-force";
  }

  if (topicId === "circuit-observer") {
    return "is-circuit";
  }

  return "";
}

function getTopicTrack(topicId: string, mode: string) {
  if (topicId === "motion-track") {
    return "图解联动 / 参数观察 / 逐步讲解";
  }

  if (topicId === "basic-force") {
    return "受力联动 / 摩擦观察 / 平衡判断";
  }

  if (topicId === "circuit-observer") {
    return "回路切换 / 亮灭联动 / 规律归纳";
  }

  if (mode === "3D") {
    return "空间演示 / 旋转观察 / 沉浸查看";
  }

  if (mode === "2D / 3D") {
    return "图层演示 / 参数联动 / 引擎扩展";
  }

  return "图解联动 / 参数观察 / 逐步讲解";
}
