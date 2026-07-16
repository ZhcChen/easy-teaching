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
    <div className="grid gap-6 lg:grid-cols-2">
      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-[28px] border border-white/10 bg-white/5 p-6"
        >
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">{section.title}</h2>
            <p className="text-sm leading-6 text-slate-300">{section.description}</p>
          </div>
          <ul className="mt-5 space-y-3">
            {section.items.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-3 text-sm text-slate-300"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}
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
