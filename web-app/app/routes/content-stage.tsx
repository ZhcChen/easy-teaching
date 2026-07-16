import { Link } from "react-router";

import { StatusPanel } from "../components/status-panel";
import { getStageById } from "../data/teaching-catalog";
import type { Route } from "./+types/content-stage";

export function meta({ params }: Route.MetaArgs) {
  const stage = getStageById(params.stageId ?? "");

  return [
    {
      title: stage ? `可视化教学 · ${stage.label}学科选择` : "可视化教学 · 学科选择",
    },
    {
      name: "description",
      content: stage
        ? `从 ${stage.label} 学段继续选择学科。`
        : "从学段继续选择学科。",
    },
  ];
}

export default function ContentStagePage({ params }: Route.ComponentProps) {
  const stage = getStageById(params.stageId ?? "");

  if (!stage) {
    return (
      <StatusPanel
        eyebrow="未找到学段"
        title="这个学段入口不存在"
        description="当前路径没有匹配到学段数据，请返回学段页重新选择。"
        tone="danger"
        actions={
          <>
            <Link to="/" className="action-link is-primary">
              返回首页
            </Link>
            <Link to="/content" className="action-link">
              打开知识库
            </Link>
          </>
        }
      />
    );
  }

  const topicCount = stage.subjects.reduce(
    (total, subject) => total + subject.topics.length,
    0,
  );

  return (
    <div className="page-stack">
      <section className="page-hero page-hero-compact">
        <div className="page-hero-copy">
          <nav className="breadcrumb" aria-label="面包屑">
            <Link to="/" className="breadcrumb-link">
              首页
            </Link>
            <span className="breadcrumb-separator">/</span>
            <Link to="/content" className="breadcrumb-link">
              知识库
            </Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{stage.label}</span>
          </nav>
          <p className="page-kicker">Step 02</p>
          <h1 className="page-title">选择 {stage.label} 学科</h1>
          <p className="page-copy">
            {stage.description} 当前先保持单页只做一个层级，让后续学科与知识点路径更清晰。
          </p>
        </div>

        <aside className="page-stat-card">
          <p className="page-stat-label">当前学段</p>
          <p className="page-stat-value">{stage.subjects.length} 个学科</p>
          <p className="page-stat-copy">{topicCount} 个知识点入口</p>
        </aside>
      </section>

      <section className="content-section">
        <div className="section-header">
          <div>
            <p className="section-kicker">Step 02</p>
            <h2 className="section-title">进入学科页</h2>
          </div>
          <p className="section-copy">每个学科继续进入下一页，知识点不在当前页堆叠展示。</p>
        </div>

        <div className="entry-grid entry-grid-subject">
          {stage.subjects.map((subject) => (
            <Link
              key={subject.id}
              to={`/content/${stage.id}/${subject.id}`}
              className="entry-card entry-card-subject"
            >
              <div className="entry-card-top">
                <span className="entry-badge">{subject.topics.length} 个知识点</span>
                <span className="entry-card-arrow">进入知识点页</span>
              </div>
              <div className="entry-card-body">
                <h3 className="entry-card-title">{subject.label}</h3>
                <p className="entry-card-copy">{subject.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
