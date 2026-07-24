export type StageId = "junior" | "senior";
export type SubjectId = "physics" | "math" | "chemistry" | "memory";
export type TeachingTopicDeliveryState = "implemented" | "planned" | "backlog";

export type TeachingTopic = {
  id: string;
  title: string;
  summary: string;
  stageId: StageId;
  subjectId: SubjectId;
  mode: "2D" | "3D" | "2D / 3D";
  deliveryState: TeachingTopicDeliveryState;
  status: "可开始" | "优先开发" | "后续扩展";
  tags: string[];
  highlights: string[];
};

export type TopicDeliveryMeta = {
  label: "已可用" | "规划中" | "后续扩展";
  actionLabel: "直接进入" | "查看规划" | "了解方向";
  description: string;
};

const TOPIC_ID_ALIASES: Record<string, string> = {
  "basic-force": "sliding-friction-lab",
};

const IMPLEMENTED_TOPIC_IDS = new Set([
  "motion-track",
  "newton-first-law-lab",
  "sliding-friction-lab",
  "pressure-factors-lab",
  "circuit-observer",
]);

const TOPIC_DELIVERY_META: Record<TeachingTopicDeliveryState, TopicDeliveryMeta> = {
  implemented: {
    label: "已可用",
    actionLabel: "直接进入",
    description: "当前已接入真实实验页，可直接用于课堂演示或预习复盘。",
  },
  planned: {
    label: "规划中",
    actionLabel: "查看规划",
    description: "当前已经纳入教学排期，但还没有对应的真实实验页。",
  },
  backlog: {
    label: "后续扩展",
    actionLabel: "了解方向",
    description: "当前仍处于主题占位阶段，后续会结合教学路线再决定是否推进。",
  },
};

export type TeachingSubject = {
  id: SubjectId;
  label: string;
  summary: string;
  topics: TeachingTopic[];
};

export type TeachingStage = {
  id: StageId;
  label: string;
  description: string;
  subjects: TeachingSubject[];
};

export const teachingStages: TeachingStage[] = [
  {
    id: "junior",
    label: "初中",
    description: "先做直观、容易理解的基础内容，强调图解、动画和实验过程。",
    subjects: [
      {
        id: "physics",
        label: "物理",
        summary: "从运动、力、电学和光学切入最适合做首批可视化。",
        topics: [
          {
            id: "motion-track",
            title: "速度与位移轨迹",
            summary: "把速度、时间、位移放到同一画布，让关系一眼能看懂。",
            stageId: "junior",
            subjectId: "physics",
            mode: "2D",
            deliveryState: "implemented",
            status: "优先开发",
            tags: ["运动学", "轨迹", "图解"],
            highlights: ["支持播放与暂停", "展示轨迹与刻度", "适合首批演示"],
          },
          {
            id: "newton-first-law-lab",
            title: "牛顿第一定律实验",
            summary: "用同一初速度对照不同阻力面上的滑行距离，并外推到理想光滑面。",
            stageId: "junior",
            subjectId: "physics",
            mode: "2D",
            deliveryState: "implemented",
            status: "优先开发",
            tags: ["惯性", "阻力", "小车轨道"],
            highlights: ["支持同速释放对照", "保留理想光滑面推理", "联动速度-时间曲线"],
          },
          {
            id: "sliding-friction-lab",
            title: "滑动摩擦力影响因素实验",
            summary: "通过匀速拉动对照压力、材质和接触面积，直观看懂滑动摩擦力大小规律。",
            stageId: "junior",
            subjectId: "physics",
            mode: "2D / 3D",
            deliveryState: "implemented",
            status: "优先开发",
            tags: ["摩擦力", "压力", "控制变量"],
            highlights: ["支持多组对照记录", "验证接触面积无关", "适合课堂实验讲解"],
          },
          {
            id: "pressure-factors-lab",
            title: "压强影响因素实验",
            summary: "用小桌、海绵和砝码对照压力与受力面积，直观看懂压强大小规律。",
            stageId: "junior",
            subjectId: "physics",
            mode: "2D",
            deliveryState: "implemented",
            status: "优先开发",
            tags: ["压强", "控制变量", "形变"],
            highlights: ["支持压力与面积双对照", "实时联动 P = F / S", "适合课堂首批演示"],
          },
          {
            id: "circuit-observer",
            title: "串并联电路观察",
            summary: "把电路连接、开关状态和灯泡亮灭放到同一画布，让差异一眼看懂。",
            stageId: "junior",
            subjectId: "physics",
            mode: "2D",
            deliveryState: "implemented",
            status: "可开始",
            tags: ["电路", "开关", "亮灭"],
            highlights: ["支持串联并联切换", "高亮电流路径与亮灭状态", "适合课堂对照讲解"],
          },
        ],
      },
      {
        id: "math",
        label: "数学",
        summary: "函数图像、平面几何和动态推导都适合做交互卡片入口。",
        topics: [
          {
            id: "parabola-graph",
            title: "抛物线图像关系",
            summary: "通过参数变化与图像联动理解函数图像特征。",
            stageId: "junior",
            subjectId: "math",
            mode: "2D",
            deliveryState: "planned",
            status: "可开始",
            tags: ["函数", "坐标系", "联动"],
            highlights: ["参数可调", "图像即时反馈", "适合讲解顶点变化"],
          },
          {
            id: "triangle-geometry",
            title: "三角形关系图解",
            summary: "用拖拽与辅助线展示角、边和证明思路。",
            stageId: "junior",
            subjectId: "math",
            mode: "2D",
            deliveryState: "backlog",
            status: "后续扩展",
            tags: ["几何", "辅助线", "证明"],
            highlights: ["拖拽观察", "适合课堂推导", "方便做记忆提示"],
          },
        ],
      },
      {
        id: "chemistry",
        label: "化学",
        summary: "先做实验步骤和现象结果，不急着上复杂模型。",
        topics: [
          {
            id: "reaction-flow",
            title: "实验流程与现象",
            summary: "按步骤卡展示实验过程、现象和结论，结构清晰易记。",
            stageId: "junior",
            subjectId: "chemistry",
            mode: "2D",
            deliveryState: "planned",
            status: "可开始",
            tags: ["实验", "流程", "现象"],
            highlights: ["步骤清晰", "适合预习复盘", "可衔接结论区"],
          },
        ],
      },
      {
        id: "memory",
        label: "记忆专题",
        summary: "适合做时间线、框架图和复习卡片的知识记忆内容。",
        topics: [
          {
            id: "timeline-memory",
            title: "时间线记忆图",
            summary: "把节点、阶段和重点事件做成一张可复看的结构图。",
            stageId: "junior",
            subjectId: "memory",
            mode: "2D",
            deliveryState: "backlog",
            status: "后续扩展",
            tags: ["时间线", "记忆", "结构图"],
            highlights: ["全局总览", "适合反复复习", "文理内容都可复用"],
          },
        ],
      },
    ],
  },
  {
    id: "senior",
    label: "高中",
    description: "聚焦建模、推导和专题理解，内容更适合 PC 工作台式展示。",
    subjects: [
      {
        id: "physics",
        label: "物理",
        summary: "优先从力学、电磁和运动专题切入，最能体现可视化价值。",
        topics: [
          {
            id: "force-analysis",
            title: "受力分析实验台",
            summary: "把受力图、参数区和结论区整合成一个可视化页面。",
            stageId: "senior",
            subjectId: "physics",
            mode: "2D / 3D",
            deliveryState: "planned",
            status: "优先开发",
            tags: ["力学", "实验台", "建模"],
            highlights: ["适合首屏展示", "支持全屏沉浸查看", "便于后续接入引擎"],
          },
          {
            id: "projectile-motion",
            title: "平抛运动分层视图",
            summary: "把水平、竖直和合运动拆分显示，适合专题理解。",
            stageId: "senior",
            subjectId: "physics",
            mode: "2D",
            deliveryState: "planned",
            status: "可开始",
            tags: ["运动学", "分解", "轨迹"],
            highlights: ["分层切换", "利于错题复盘", "适合 PC 展示"],
          },
          {
            id: "electromagnetic-field",
            title: "电场与磁场可视化",
            summary: "以后可扩展成更强的场线与粒子运动演示。",
            stageId: "senior",
            subjectId: "physics",
            mode: "2D / 3D",
            deliveryState: "backlog",
            status: "后续扩展",
            tags: ["电磁", "场线", "演示"],
            highlights: ["更强科技感", "适合后续 3D", "专题延展空间大"],
          },
        ],
      },
      {
        id: "math",
        label: "数学",
        summary: "函数、解析几何和空间图形都适合科技简约的交互风格。",
        topics: [
          {
            id: "function-lab",
            title: "函数参数实验室",
            summary: "调整参数并同步观察图像变化与性质结论。",
            stageId: "senior",
            subjectId: "math",
            mode: "2D",
            deliveryState: "planned",
            status: "可开始",
            tags: ["函数", "参数", "图像"],
            highlights: ["直接看变化", "适合 PC 讲解", "可叠加结论提示"],
          },
          {
            id: "solid-geometry",
            title: "立体几何观察台",
            summary: "适合后续接入 3D 旋转视图，先做核心关系演示。",
            stageId: "senior",
            subjectId: "math",
            mode: "3D",
            deliveryState: "backlog",
            status: "后续扩展",
            tags: ["立几", "空间", "旋转"],
            highlights: ["3D 潜力大", "适合全屏", "能体现引擎价值"],
          },
        ],
      },
      {
        id: "chemistry",
        label: "化学",
        summary: "先做结构和过程，再逐步扩展到更复杂的模型展示。",
        topics: [
          {
            id: "molecule-structure",
            title: "分子结构观察",
            summary: "用简约科技风展示结构、键角和重点标注。",
            stageId: "senior",
            subjectId: "chemistry",
            mode: "3D",
            deliveryState: "backlog",
            status: "后续扩展",
            tags: ["分子", "结构", "模型"],
            highlights: ["适合 3D", "结构表达直观", "后续可接旋转交互"],
          },
        ],
      },
      {
        id: "memory",
        label: "记忆专题",
        summary: "可以服务知识框架、时间线和抽认卡内容。",
        topics: [
          {
            id: "framework-map",
            title: "知识框架地图",
            summary: "把知识点关系组织成结构图，适合全屏浏览和记忆。",
            stageId: "senior",
            subjectId: "memory",
            mode: "2D",
            deliveryState: "planned",
            status: "可开始",
            tags: ["框架", "结构", "复盘"],
            highlights: ["总览清晰", "适合长内容", "可服务文理多学科"],
          },
        ],
      },
    ],
  },
];

export function getStageById(stageId: string) {
  return teachingStages.find((stage) => stage.id === stageId);
}

export function getSubjectByStageAndId(stageId: string, subjectId: string) {
  const stage = getStageById(stageId);
  if (!stage) {
    return null;
  }

  const subject = stage.subjects.find((item) => item.id === subjectId);
  if (!subject) {
    return null;
  }

  return {
    stage,
    subject,
  };
}

export function getTopicById(topicId: string) {
  const normalizedTopicId = normalizeTopicId(topicId);

  for (const stage of teachingStages) {
    for (const subject of stage.subjects) {
      const topic = subject.topics.find((item) => item.id === normalizedTopicId);
      if (topic) {
        return {
          stage,
          subject,
          topic,
        };
      }
    }
  }

  return null;
}

export function normalizeTopicId(topicId: string) {
  return TOPIC_ID_ALIASES[topicId] ?? topicId;
}

export function isImplementedTopicId(topicId: string) {
  return IMPLEMENTED_TOPIC_IDS.has(normalizeTopicId(topicId));
}

export function isSlidingFrictionTopicId(topicId: string) {
  return normalizeTopicId(topicId) === "sliding-friction-lab";
}

export function getTopicDeliveryMeta(topic: TeachingTopic) {
  return TOPIC_DELIVERY_META[topic.deliveryState];
}
