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
  const defaultStage = teachingStages[1]?.id ?? teachingStages[0]?.id ?? "junior";
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
    <div className="space-y-6">
      <section className="rounded-[32px] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(15,23,42,0.92)_42%,rgba(59,130,246,0.08))] p-8 shadow-[0_30px_80px_rgba(2,6,23,0.45)]">
        <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-cyan-200 uppercase">
          {eyebrow}
        </span>
        <div className="mt-4 max-w-4xl space-y-3">
          <h2 className="text-4xl font-semibold tracking-tight text-white">
            {title}
          </h2>
          <p className="max-w-3xl text-base leading-8 text-slate-300">
            {description}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-2">
            入口顺序：学段 → 学科 → 知识点
          </span>
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-2">
            设计风格：科技风格 · 简约
          </span>
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-2">
            点击知识点直接进入可视化页面
          </span>
        </div>
      </section>

      <section className="rounded-[30px] border border-white/10 bg-slate-950/55 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
              当前路径
            </p>
            <h3 className="mt-3 text-xl font-semibold text-white">
              {selectedStage.label} / {selectedSubject.label}
            </h3>
          </div>
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 px-4 py-3 text-right">
            <p className="text-xs tracking-[0.18em] text-cyan-200 uppercase">
              当前知识点
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {selectedSubject.topics.length} 个入口
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
              Step 01
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">先选学段</h3>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-400">
            入口先以学段切分，后面再细分到学科和知识点，结构更稳定。
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {teachingStages.map((stage) => {
            const active = stage.id === selectedStage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => handleStageChange(stage.id)}
                className={[
                  "group rounded-[28px] border p-6 text-left transition",
                  active
                    ? "border-cyan-400/30 bg-cyan-400/10 shadow-[0_18px_48px_rgba(8,145,178,0.16)]"
                    : "border-white/10 bg-slate-950/45 hover:border-cyan-400/20 hover:bg-white/5",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-cyan-200">
                      {stage.label}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {stage.description}
                    </p>
                  </div>
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs",
                      active
                        ? "bg-cyan-400 text-slate-950"
                        : "border border-white/10 text-slate-400",
                    ].join(" ")}
                  >
                    {stage.subjects.length} 学科
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
              Step 02
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">再选学科</h3>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-400">
            当前先做卡片式入口，不做复杂筛选器，保持直达感。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {selectedStage.subjects.map((subject) => {
            const active = subject.id === selectedSubject.id;
            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => setSelectedSubjectId(subject.id)}
                className={[
                  "rounded-[28px] border p-5 text-left transition",
                  active
                    ? "border-cyan-400/30 bg-white/8 shadow-[0_18px_48px_rgba(8,145,178,0.12)]"
                    : "border-white/10 bg-slate-950/45 hover:border-cyan-400/20 hover:bg-white/5",
                ].join(" ")}
              >
                <p className="text-lg font-semibold text-white">{subject.label}</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {subject.summary}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
              Step 03
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              最后选知识点
            </h3>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-400">
            点击卡片直接进入对应可视化页面，后面再逐步替换为真实 2D / 3D
            引擎内容。
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {selectedSubject.topics.map((topic) => (
            <Link
              key={topic.id}
              to={`/visual/${topic.id}`}
              className="group flex h-full flex-col rounded-[28px] border border-white/10 bg-slate-950/55 p-6 transition hover:border-cyan-400/25 hover:bg-white/5 hover:shadow-[0_20px_56px_rgba(8,145,178,0.12)]"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                  {topic.mode}
                </span>
                <span className="text-xs text-slate-500">{topic.status}</span>
              </div>
              <h4 className="mt-5 text-2xl font-semibold text-white transition group-hover:text-cyan-100">
                {topic.title}
              </h4>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                {topic.summary}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {topic.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <ul className="mt-5 space-y-2 text-sm text-slate-400">
                {topic.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6 text-sm font-medium text-cyan-200">
                进入可视化页面 →
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
