import { Link } from "react-router";

import { StatusPanel } from "../components/status-panel";
import { useDocumentMeta, useLocale } from "../i18n";
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
  const { isZh, tt } = useLocale();
  const stage = getStageById(params.stageId ?? "");

  useDocumentMeta({
    title: stage
      ? isZh
        ? `${tt("可视化教学")} · ${tt(stage.label)}学科选择`
        : `${tt("可视化教学")} · ${tt(stage.label)} subjects`
      : `${tt("可视化教学")} · ${tt("学科")}`,
    description: stage
      ? isZh
        ? `从 ${tt(stage.label)} 学段继续选择学科。`
        : `Continue from the ${tt(stage.label)} stage to choose a subject.`
      : tt("从学段继续选择学科。"),
  });

  if (!stage) {
    return (
      <StatusPanel
        eyebrow={tt("未找到学段")}
        title={tt("这个学段入口不存在")}
        description={tt("当前路径没有匹配到学段数据，请返回学段页重新选择。")}
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

  const topicCount = stage.subjects.reduce(
    (total, subject) => total + subject.topics.length,
    0,
  );

  return (
    <div className="page-stack">
      <section className="page-hero page-hero-compact">
        <div className="page-hero-copy">
          <nav className="breadcrumb" aria-label={tt("面包屑")}>
            <Link to="/" className="breadcrumb-link">
              {tt("首页")}
            </Link>
            <span className="breadcrumb-separator">/</span>
            <Link to="/content" className="breadcrumb-link">
              {tt("知识库")}
            </Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{tt(stage.label)}</span>
          </nav>
          <p className="page-kicker">Step 02</p>
          <h1 className="page-title">
            {isZh ? `选择 ${tt(stage.label)} 学科` : `Choose ${tt(stage.label)} subjects`}
          </h1>
          <p className="page-copy">
            {tt(stage.description)}
          </p>
        </div>

        <aside className="page-stat-card">
          <p className="page-stat-label">{tt("当前学段")}</p>
          <p className="page-stat-value">{tt(`${stage.subjects.length} 个学科`)}</p>
          <p className="page-stat-copy">{tt(`${topicCount} 个知识点入口`)}</p>
        </aside>
      </section>

      <section className="content-flow-section">
        <div className="section-header">
          <div>
            <p className="section-kicker">Step 02</p>
            <h2 className="section-title">{tt("进入学科页")}</h2>
          </div>
          <p className="section-copy">{tt("每个学科继续进入下一页，知识点不在当前页堆叠展示。")}</p>
        </div>

        <div className="entry-grid entry-grid-subject">
          {stage.subjects.map((subject) => {
            const accentClass = getSubjectAccentClass(subject.id);
            const previewTopics = subject.topics.slice(0, 2).map((topic) => topic.title);

            return (
              <Link
                key={subject.id}
                to={`/content/${stage.id}/${subject.id}`}
                className={`entry-card entry-card-subject subject-card ${accentClass}`}
              >
                <div className="subject-card-grid" aria-hidden="true" />
                <div className="subject-card-glow" aria-hidden="true" />

                <div className="entry-card-top subject-card-top">
                  <div className="subject-card-kicker-row">
                    <span className="entry-badge">{tt(`${subject.topics.length} 个知识点`)}</span>
                    <span className="subject-card-channel">{tt("学科工作台")}</span>
                  </div>
                  <span className="entry-card-arrow">{tt("进入知识点页")}</span>
                </div>

                <div className="entry-card-body subject-card-body">
                  <h3 className="entry-card-title">{tt(subject.label)}</h3>
                  <p className="entry-card-copy">{tt(subject.summary)}</p>
                </div>

                <div className="subject-card-preview">
                  {previewTopics.map((topic) => (
                    <article key={topic} className="subject-card-preview-item">
                      <span className="subject-card-preview-dot" aria-hidden="true" />
                      <span>{tt(topic)}</span>
                    </article>
                  ))}
                </div>

                <div className="subject-card-footer">
                  <span className="subject-card-track">{tt(getSubjectTrack(subject.id))}</span>
                  <span className="subject-card-footer-line" aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function getSubjectAccentClass(subjectId: string) {
  return `is-${subjectId}`;
}

function getSubjectTrack(subjectId: string) {
  switch (subjectId) {
    case "physics":
      return "运动 / 力学 / 电学";
    case "math":
      return "函数 / 几何 / 空间";
    case "chemistry":
      return "结构 / 实验 / 现象";
    case "memory":
      return "框架 / 时间线 / 记忆";
    default:
      return "知识内容";
  }
}
