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
    <div className="page-stack">
      <section className="hero-surface">
        <span className="eyebrow-chip">学习页</span>
        <div className="hero-copy-block">
          <h2 className="hero-heading">学习记录先本地沉淀，再逐步同步</h2>
          <p className="hero-paragraph">
            当前阶段先保证本地记录稳定可用，后续再通过同步中心把本地数据同步到云端。
          </p>
        </div>
      </section>

      <section className="simple-grid">
        <div className="surface-panel">
          <p className="surface-eyebrow">学习内容</p>
          <h3 className="surface-title">当前重点沉淀</h3>
          <div className="list-stack">
          {records.map((item) => (
              <article key={item.title} className="list-card">
                <p className="list-card-title">{item.title}</p>
                <p className="list-card-copy">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>

        <aside className="surface-panel">
          <p className="surface-eyebrow">同步中心</p>
          <h3 className="surface-title">后续同步规划</h3>
          <ol className="step-list">
            {syncSteps.map((step, index) => (
              <li key={step} className="step-list-item">
                <span className="step-list-index">{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </aside>
      </section>
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
