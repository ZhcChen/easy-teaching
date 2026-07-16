import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { getTopicById } from "../data/teaching-catalog";
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
  const topicData = getTopicById(params.topicId ?? "");
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === fullscreenRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
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
      <div className="rounded-[30px] border border-rose-500/20 bg-rose-500/10 p-8">
        <p className="text-sm tracking-[0.18em] text-rose-200 uppercase">
          无法找到对应知识点
        </p>
        <h2 className="mt-4 text-2xl font-semibold text-white">
          这个可视化页面还没有准备好
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-rose-100/80">
          当前路由没有匹配到知识点数据。你可以先返回首页或知识库重新选择。
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to="/"
            className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
          >
            返回首页
          </Link>
          <Link
            to="/content"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            打开知识库
          </Link>
        </div>
      </div>
    );
  }

  const { stage, subject, topic } = topicData;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[30px] border border-white/10 bg-slate-950/55 p-6">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
            {stage.label} / {subject.label} / 可视化页面
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {topic.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            {topic.summary}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            返回首页
          </Link>
          <Link
            to="/content"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            返回知识库
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <article className="rounded-[30px] border border-cyan-400/15 bg-cyan-400/8 p-6">
          <p className="text-xs font-medium tracking-[0.2em] text-cyan-200 uppercase">
            页面说明
          </p>
          <h3 className="mt-4 text-2xl font-semibold text-white">
            当前先用科技简约风承接可视化页面
          </h3>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
            {topic.highlights.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>

        <aside className="rounded-[30px] border border-white/10 bg-slate-950/55 p-6">
          <p className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
            全屏说明
          </p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-400">
            <p>点击右上角全屏图标即可进入全屏查看。</p>
            <p>进入全屏后，右上角会保留退出全屏按钮。</p>
            <p>按键盘 `Esc` 也可以直接退出全屏。</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {topic.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </aside>
      </section>

      <section
        ref={fullscreenRef}
        className="visual-fullscreen-shell rounded-[34px] border border-cyan-400/15 bg-slate-950/70 p-6 shadow-[0_32px_90px_rgba(2,6,23,0.48)]"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
              可视化画布
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {topic.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-400/20 hover:bg-cyan-400/10 hover:text-white"
            aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
            title={isFullscreen ? "退出全屏" : "进入全屏"}
          >
            {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
          </button>
        </div>

        <div className="visual-canvas relative mt-6 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,15,28,0.98),rgba(5,10,20,1))] p-6">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:28px_28px] opacity-25" />
          <div className="absolute left-[10%] top-[14%] h-28 w-28 rounded-full border border-cyan-400/20 bg-cyan-400/8 blur-[2px]" />
          <div className="absolute right-[12%] top-[18%] h-24 w-24 rounded-full border border-blue-400/20 bg-blue-400/8 blur-[2px]" />
          <div className="absolute left-[20%] top-1/2 h-px w-[52%] -rotate-12 bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-80" />
          <div className="absolute left-[28%] top-[58%] h-px w-[44%] rotate-12 bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-70" />

          <div className="relative flex h-full min-h-[580px] flex-col justify-between">
            <div className="grid gap-4 md:grid-cols-3">
              {sceneMetrics.map((metric) => (
                <article
                  key={metric.label}
                  className="rounded-[24px] border border-white/8 bg-white/5 p-4 backdrop-blur"
                >
                  <p className="text-xs tracking-[0.18em] text-slate-500 uppercase">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {metric.detail}
                  </p>
                </article>
              ))}
            </div>

            <div className="relative mx-auto grid w-full max-w-3xl place-items-center">
              <div className="absolute h-[340px] w-[340px] rounded-full border border-cyan-400/15" />
              <div className="absolute h-[240px] w-[240px] rounded-full border border-white/10" />
              <div className="absolute h-[96px] w-[96px] rounded-[28px] border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_40px_rgba(34,211,238,0.22)]" />
              <div className="absolute left-[14%] top-[18%] rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">
                参数层
              </div>
              <div className="absolute right-[12%] top-[20%] rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">
                结论层
              </div>
              <div className="absolute bottom-[16%] left-[20%] rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">
                图形层
              </div>
              <div className="absolute bottom-[14%] right-[18%] rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">
                状态层
              </div>
              <div className="h-[340px]" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {topic.highlights.map((item) => (
                <article
                  key={item}
                  className="rounded-[24px] border border-white/8 bg-white/5 p-4"
                >
                  <p className="text-sm leading-7 text-slate-300">{item}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
      <path d="M8 4H4v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 4h4v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 16v4h-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v4h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 9L4 4" strokeLinecap="round" />
      <path d="M15 9l5-5" strokeLinecap="round" />
      <path d="M9 15l-5 5" strokeLinecap="round" />
      <path d="M15 15l5 5" strokeLinecap="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
      <path d="M9 4H4v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 4h5v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v5h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9l5-5" strokeLinecap="round" />
      <path d="M20 9l-5-5" strokeLinecap="round" />
      <path d="M4 15l5 5" strokeLinecap="round" />
      <path d="M20 15l-5 5" strokeLinecap="round" />
    </svg>
  );
}

const sceneMetrics = [
  {
    label: "页面状态",
    value: "科技简约",
    detail: "当前先验证页面气质和进入流程，不急着堆过多控件。",
  },
  {
    label: "全屏能力",
    value: "已支持",
    detail: "点击右上角图标进入或退出全屏，按 Esc 也能退出。",
  },
  {
    label: "后续接入",
    value: "2D / 3D",
    detail: "当前是静态科技画布，后面逐步替换为真实可视化引擎。",
  },
];
