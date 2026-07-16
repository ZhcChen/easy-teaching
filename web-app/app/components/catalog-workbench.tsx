import { useMemo, useState } from "react";
import { Link } from "react-router";

import {
  getStageById,
  teachingStages,
  type StageId,
  type SubjectId,
} from "../data/teaching-catalog";

type CatalogWorkbenchProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function CatalogWorkbench({
  eyebrow,
  title,
  description,
}: CatalogWorkbenchProps) {
  const defaultStage = teachingStages[0]?.id ?? "junior";
  const initialStage = getStageById(defaultStage)!;

  const [selectedStageId, setSelectedStageId] = useState<StageId>(initialStage.id);
  const [selectedSubjectId, setSelectedSubjectId] = useState<SubjectId>(
    initialStage.subjects[0]!.id,
  );

  const selectedStage = useMemo(
    () => getStageById(selectedStageId) ?? teachingStages[0]!,
    [selectedStageId],
  );

  const selectedSubject =
    selectedStage.subjects.find((subject) => subject.id === selectedSubjectId) ??
    selectedStage.subjects[0]!;

  function handleStageChange(stageId: StageId) {
    const nextStage = getStageById(stageId);
    if (!nextStage) {
      return;
    }

    setSelectedStageId(stageId);
    setSelectedSubjectId(nextStage.subjects[0]!.id);
  }

  return (
    <div className="page-stack">
      <section className="hero-surface">
        <span className="eyebrow-chip">{eyebrow}</span>
        <div className="hero-copy-block">
          <h2 className="hero-heading">{title}</h2>
          <p className="hero-paragraph">{description}</p>
        </div>
        <div className="hero-meta-row">
          <span className="meta-pill">学段 → 学科 → 知识点</span>
          <span className="meta-pill">默认亮色主题</span>
          <span className="meta-pill">点击知识点直接进入页面</span>
        </div>
      </section>

      <section className="path-surface">
        <div className="surface-head">
          <div>
            <p className="surface-eyebrow">当前路径</p>
            <h3 className="surface-title">
              {selectedStage.label} / {selectedSubject.label}
            </h3>
          </div>
          <div className="count-chip">
            <p className="count-chip-label">当前知识点</p>
            <p className="count-chip-value">
              {selectedSubject.topics.length} 个入口
            </p>
          </div>
        </div>
      </section>

      <section className="step-section">
        <div className="section-heading">
          <div>
            <p className="section-step">Step 01</p>
            <h3 className="section-title">选择学段</h3>
          </div>
          <p className="section-copy">入口先按学段切分，后面再细分到学科和知识点。</p>
        </div>
        <div className="choice-grid">
          {teachingStages.map((stage) => {
            const active = stage.id === selectedStage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => handleStageChange(stage.id)}
                className={active ? "choice-card is-active" : "choice-card"}
              >
                <div className="choice-card-top">
                  <div>
                    <p className="choice-card-title">{stage.label}</p>
                    <p className="choice-card-copy">{stage.description}</p>
                  </div>
                  <span className="choice-card-count">{stage.subjects.length} 学科</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="step-section">
        <div className="section-heading">
          <div>
            <p className="section-step">Step 02</p>
            <h3 className="section-title">选择学科</h3>
          </div>
          <p className="section-copy">保持直接，不上复杂筛选器，先让学科入口足够清楚。</p>
        </div>
        <div className="subject-grid">
          {selectedStage.subjects.map((subject) => {
            const active = subject.id === selectedSubject.id;
            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => setSelectedSubjectId(subject.id)}
                className={active ? "subject-card is-active" : "subject-card"}
              >
                <p className="subject-card-title">{subject.label}</p>
                <p className="subject-card-copy">{subject.summary}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="step-section">
        <div className="section-heading">
          <div>
            <p className="section-step">Step 03</p>
            <h3 className="section-title">选择知识点</h3>
          </div>
          <p className="section-copy">点击卡片直接进入对应可视化页面，后续再替换为真实引擎内容。</p>
        </div>
        <div className="topic-grid">
          {selectedSubject.topics.map((topic) => (
            <Link
              key={topic.id}
              to={`/visual/${topic.id}`}
              className="topic-card"
            >
              <div className="topic-card-top">
                <span className="topic-mode-pill">{topic.mode}</span>
                <span className="topic-status">{topic.status}</span>
              </div>
              <h4 className="topic-card-title">{topic.title}</h4>
              <p className="topic-card-copy">{topic.summary}</p>
              <div className="topic-tag-row">
                {topic.tags.map((tag) => (
                  <span key={tag} className="topic-tag">
                    {tag}
                  </span>
                ))}
              </div>
              <ul className="topic-highlight-list">
                {topic.highlights.map((item) => (
                  <li key={item} className="topic-highlight-item">
                    <span className="topic-highlight-dot" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="topic-link-copy">
                进入可视化页面 →
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
