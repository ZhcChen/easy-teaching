import type { Route } from "./+types/me";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "可视化教学 · 我的" },
    {
      name: "description",
      content: "偏好、本地数据、同步设置与账号能力的一级入口。",
    },
  ];
}

export default function MePage() {
  return (
    <div className="page-stack">
      <section className="hero-surface">
        <span className="eyebrow-chip">我的</span>
        <div className="hero-copy-block">
          <h2 className="hero-heading">偏好、本地数据与同步入口集中管理</h2>
          <p className="hero-paragraph">
            当前“我的”先保持克制，重点说明后续会承接的偏好、本地数据和同步能力。
          </p>
        </div>
      </section>

      <section className="simple-grid">
      {sections.map((section) => (
        <section key={section.title} className="surface-panel">
          <div>
            <p className="surface-eyebrow">模块说明</p>
            <h2 className="surface-title">{section.title}</h2>
            <p className="surface-copy">{section.description}</p>
          </div>
          <ul className="list-stack">
            {section.items.map((item) => (
              <li key={item} className="list-card">
                <p className="list-card-title">{item}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      </section>
    </div>
  );
}

const sections = [
  {
    title: "偏好与内容设置",
    description: "管理学段偏好、常用学科、主题推荐与视觉显示偏好。",
    items: ["默认学段", "常用学科", "主题模式", "播放与动效偏好"],
  },
  {
    title: "本地数据与同步",
    description: "后续会从这里进入本地数据导出、同步状态查看与手动同步。",
    items: ["本地数据概览", "最近同步状态", "手动同步入口", "恢复与迁移"],
  },
];
