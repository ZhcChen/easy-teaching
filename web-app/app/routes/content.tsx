import type { Route } from "./+types/content";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "可视化教学 · 内容" },
    {
      name: "description",
      content: "按学段、学科与章节组织可视化教学内容的一级入口。",
    },
  ];
}

export default function ContentPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs tracking-[0.18em] text-cyan-200 uppercase">
            内容主路径
          </span>
          <h2 className="text-2xl font-semibold text-white">
            学段 → 学科 → 章节 / 专题 → 内容
          </h2>
          <p className="text-sm leading-6 text-slate-300">
            入口先按学段，再进入学科，能够更自然地承接初中与高中的课程差异，也方便后续扩展文理科内容。
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {stages.map((stage) => (
            <article
              key={stage.name}
              className="rounded-[24px] border border-white/8 bg-slate-950/50 p-5"
            >
              <p className="text-lg font-medium text-white">{stage.name}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {stage.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {stage.subjects.map((subject) => (
                  <span
                    key={subject}
                    className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-slate-200"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6">
        <h3 className="text-xl font-semibold text-white">首批内容建议</h3>
        <ul className="mt-5 space-y-3">
          {topics.map((topic) => (
            <li
              key={topic.title}
              className="rounded-2xl border border-white/8 bg-slate-950/40 p-4"
            >
              <p className="font-medium text-white">{topic.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {topic.detail}
              </p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

const stages = [
  {
    name: "初中",
    description: "先承接基础概念、实验演示与轻量交互内容，强调看得懂、记得住。",
    subjects: ["物理", "数学", "化学", "记忆专题"],
  },
  {
    name: "高中",
    description: "强化模型拆解、推导理解与多步交互，逐步接入更复杂的 2D / 3D 场景。",
    subjects: ["物理", "数学", "化学", "综合专题"],
  },
];

const topics = [
  {
    title: "物理",
    detail: "先从运动学、受力分析、电学基础等高可视化内容切入。",
  },
  {
    title: "数学",
    detail: "后续适合接入函数图像、几何关系、空间解析与动态推导。",
  },
  {
    title: "化学",
    detail: "后续可逐步承接分子结构、反应过程与实验流程的演示。",
  },
];
