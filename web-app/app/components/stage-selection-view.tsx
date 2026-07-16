import { Link } from "react-router";

import { teachingStages } from "../data/teaching-catalog";

type StageSelectionViewProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function StageSelectionView({
  eyebrow,
  title,
  description,
}: StageSelectionViewProps) {
  return (
    <div className="page-stack">
      <section className="page-hero">
        <div className="page-hero-copy">
          <p className="page-kicker">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-copy">{description}</p>
        </div>

        <aside className="hero-summary-card" aria-label="选择流程">
          <p className="hero-summary-label">选择流程</p>
          <ol className="flow-steps">
            {flowSteps.map((step, index) => (
              <li key={step} className="flow-step">
                <span className="flow-step-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="flow-step-label">{step}</span>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      <section className="content-section">
        <div className="section-header">
          <div>
            <p className="section-kicker">Step 01</p>
            <h2 className="section-title">选择学段</h2>
          </div>
          <p className="section-copy">首页只保留第一步，学科和知识点进入下一页继续选择。</p>
        </div>

        <div className="entry-grid entry-grid-stage">
          {teachingStages.map((stage) => {
            const topicCount = stage.subjects.reduce(
              (total, subject) => total + subject.topics.length,
              0,
            );

            return (
              <Link
                key={stage.id}
                to={`/content/${stage.id}`}
                className="entry-card entry-card-stage"
              >
                <div className="entry-card-top">
                  <span className="entry-card-index">{stage.id === "junior" ? "01" : "02"}</span>
                  <span className="entry-card-arrow">进入学科页</span>
                </div>
                <div className="entry-card-body">
                  <h3 className="entry-card-title">{stage.label}</h3>
                  <p className="entry-card-copy">{stage.description}</p>
                </div>
                <div className="entry-card-meta">
                  <span className="entry-card-meta-item">{stage.subjects.length} 个学科</span>
                  <span className="entry-card-meta-item">{topicCount} 个知识点</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const flowSteps = ["学段", "学科", "知识点", "可视化页面"];
