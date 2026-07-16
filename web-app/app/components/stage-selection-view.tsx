import { Link } from "react-router";

import { teachingStages } from "../data/teaching-catalog";

export function StageSelectionView() {
  return (
    <div className="page-stack">
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
