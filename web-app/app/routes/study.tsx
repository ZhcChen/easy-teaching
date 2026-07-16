import type { Route } from "./+types/study";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "可视化教学 · 学习" },
    {
      name: "description",
      content: "学习记录、收藏、复习与同步中心的一级入口。",
    },
  ];
}

export default function StudyPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs tracking-[0.18em] text-emerald-200 uppercase">
            本地优先
          </span>
          <h2 className="text-2xl font-semibold text-white">学习域先把本地数据沉淀好</h2>
          <p className="text-sm leading-6 text-slate-300">
            当前阶段先保证本地记录稳定可用，后续再通过同步中心把本地数据同步到云端。
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {records.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-white/8 bg-slate-950/50 p-4"
            >
              <p className="font-medium text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <aside className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6">
        <h3 className="text-xl font-semibold text-white">后续同步中心规划</h3>
        <ol className="mt-5 space-y-3">
          {syncSteps.map((step, index) => (
            <li
              key={step}
              className="flex gap-3 rounded-2xl border border-white/8 bg-slate-950/40 p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-xs font-semibold text-slate-950">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-slate-300">{step}</p>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

const records = [
  {
    title: "最近学习",
    description: "保留最近进入的章节、实验参数与最近一次学习位置。",
  },
  {
    title: "收藏与复习",
    description: "沉淀收藏内容、错题、记忆卡片与重点标记。",
  },
  {
    title: "进度与笔记",
    description: "保留学习进度、个人笔记与实验过程中的自定义记录。",
  },
];

const syncSteps = [
  "先建立本地数据模型与版本管理，避免后续同步时结构频繁漂移。",
  "提供手动同步入口，让用户明确知道本地数据何时上云、何时回拉。",
  "云端阶段再增加账号体系、冲突合并与跨端恢复能力。",
];
