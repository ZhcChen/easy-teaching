import { Link } from "react-router";

import { teachingStages } from "../data/teaching-catalog";

export function StageSelectionView() {
  return (
    <div className="page-stack">
      <section className="content-flow-section stage-selection-flow">
        <div className="section-header stage-selection-header">
          <div className="stage-selection-title-block">
            <p className="section-kicker">Step 01</p>
            <h1 className="section-title stage-selection-title">选择学段</h1>
            <p className="stage-selection-copy">先确定学习范围，再逐页进入学科与知识点页面。</p>
          </div>
          <div className="stage-selection-pills" aria-label="界面特性">
            {featurePills.map((item) => (
              <span key={item} className="stage-selection-pill">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="entry-grid entry-grid-stage">
          {teachingStages.map((stage) => {
            const topicCount = stage.subjects.reduce(
              (total, subject) => total + subject.topics.length,
              0,
            );
            const subjectPreview = stage.subjects.slice(0, 3).map((subject) => subject.label);
            const stageMode = getStageMode(stage);
            const stageTrack =
              stage.id === "junior" ? "图解 / 动画 / 实验" : "建模 / 推导 / 专题";
            const stageClass = stage.id === "junior" ? "is-junior" : "is-senior";

            return (
              <Link
                key={stage.id}
                to={`/content/${stage.id}`}
                className={`entry-card entry-card-stage stage-card ${stageClass}`}
              >
                <div className="stage-card-grid" aria-hidden="true" />
                <div className="stage-card-rings" aria-hidden="true">
                  <span className="stage-card-ring stage-card-ring-lg" />
                  <span className="stage-card-ring stage-card-ring-md" />
                  <span className="stage-card-dot" />
                </div>

                <div className="entry-card-top stage-card-top">
                  <div className="stage-card-kicker-row">
                    <span className="entry-card-index">
                      {stage.id === "junior" ? "01" : "02"}
                    </span>
                    <span className="stage-card-channel">教学入口</span>
                  </div>
                  <span className="entry-card-arrow">进入学科页</span>
                </div>

                <div className="entry-card-body stage-card-body">
                  <h3 className="entry-card-title">{stage.label}</h3>
                  <p className="entry-card-copy">{stage.description}</p>
                  <div className="stage-card-tags">
                    {subjectPreview.map((subject) => (
                      <span key={subject} className="stage-card-tag">
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="stage-card-metrics">
                  <article className="stage-card-metric">
                    <span className="stage-card-metric-label">学科</span>
                    <strong className="stage-card-metric-value">{stage.subjects.length}</strong>
                  </article>
                  <article className="stage-card-metric">
                    <span className="stage-card-metric-label">知识点</span>
                    <strong className="stage-card-metric-value">{topicCount}</strong>
                  </article>
                  <article className="stage-card-metric">
                    <span className="stage-card-metric-label">模式</span>
                    <strong className="stage-card-metric-value is-text">{stageMode}</strong>
                  </article>
                </div>

                <div className="stage-card-footer">
                  <span className="stage-card-track">{stageTrack}</span>
                  <span className="stage-card-footer-line" aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const featurePills = ["科技图解", "逐页进入", "本地优先"];

function getStageMode(stage: (typeof teachingStages)[number]) {
  const modes = new Set<string>();

  for (const subject of stage.subjects) {
    for (const topic of subject.topics) {
      if (topic.mode.includes("2D")) {
        modes.add("2D");
      }

      if (topic.mode.includes("3D")) {
        modes.add("3D");
      }
    }
  }

  if (modes.has("2D") && modes.has("3D")) {
    return "2D / 3D";
  }

  if (modes.has("3D")) {
    return "3D";
  }

  return "2D";
}
