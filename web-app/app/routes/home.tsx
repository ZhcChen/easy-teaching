import type { Route } from "./+types/home";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "可视化教学 · 首页" },
    {
      name: "description",
      content: "可视化教学 Web App 基座，面向 PC 与 H5，采用本地优先的数据策略。",
    },
  ];
}

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-cyan-400/20 via-slate-900 to-indigo-500/20 p-6 shadow-2xl shadow-slate-950/25 sm:p-8">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs tracking-[0.18em] text-slate-200 uppercase">
            当前主线
          </span>
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              先把 Web 基座打稳，再逐步接入可视化引擎
            </h2>
            <p className="text-sm leading-7 text-slate-200/85 sm:text-base">
              当前模块已切换到 React Router 官方最新脚手架，优先承接 PC 与 H5
              共用页面、内容路由、本地学习数据与后续 2D / 3D
              可视化场景的接入边界。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/content"
              className="inline-flex items-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
            >
              查看内容结构
            </Link>
            <Link
              to="/study"
              className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              查看学习域规划
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <article
            key={item.title}
            className="rounded-[24px] border border-white/10 bg-white/5 p-5"
          >
            <p className="text-sm font-medium text-cyan-200">{item.title}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {item.description}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <article className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-white">信息架构</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                延续已确认的四大域：首页、内容、学习、我的。核心内容路径先走
                “学段 → 学科 → 章节 / 专题 → 内容”。
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {flows.map((flow) => (
              <div
                key={flow.name}
                className="rounded-2xl border border-white/8 bg-slate-950/50 p-4"
              >
                <p className="text-sm font-medium text-white">{flow.name}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {flow.description}
                </p>
              </div>
            ))}
          </div>
        </article>

        <aside className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <h3 className="text-xl font-semibold text-white">当前落地状态</h3>
          <ul className="mt-5 space-y-3 text-sm text-slate-300">
            {progress.map((item) => (
              <li
                key={item.label}
                className="rounded-2xl border border-white/8 bg-slate-950/40 p-4"
              >
                <p className="font-medium text-white">{item.label}</p>
                <p className="mt-2 leading-6 text-slate-400">{item.detail}</p>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}

const highlights = [
  {
    title: "本地优先",
    description:
      "学习记录、偏好、收藏与进度先落本地，后续再通过同步中心接入云端。",
  },
  {
    title: "双端适配",
    description:
      "同一套应用骨架覆盖 PC 与 H5，移动端保留底部导航，桌面端转为顶部工作区。",
  },
  {
    title: "双引擎预留",
    description:
      "2D 内容为 PixiJS 预留接入位，3D 内容为 Three.js 预留接入位，暂不在这一轮强行接入。",
  },
];

const flows = [
  {
    name: "首页",
    description: "承接导流、课程概览、推荐专题与快速进入路径。",
  },
  {
    name: "内容",
    description: "按学段、学科与章节组织内容，并进入具体可视化教学页面。",
  },
  {
    name: "学习",
    description: "承接学习历史、收藏、复习卡片、实验记录与同步入口。",
  },
  {
    name: "我的",
    description: "管理偏好、本地数据、账号状态、资源下载与后续同步设置。",
  },
];

const progress = [
  {
    label: "脚手架",
    detail: "已切换到 React Router 官方最新模板，并固定本地开发端口为 57001。",
  },
  {
    label: "路由基座",
    detail: "已先落首页、内容、学习、我的四个一级入口，方便后续继续扩展。",
  },
  {
    label: "下一步",
    detail: "继续衔接 UI 设计预览模块，并逐步接入学科内容、可视化引擎与本地数据存储。",
  },
];
