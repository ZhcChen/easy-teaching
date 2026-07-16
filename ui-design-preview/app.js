const state = {
  view: "content",
  stage: "senior",
  subject: "physics",
  chapter: "mechanics",
  scene: "force-lab",
  contentType: "全部",
  contextTab: "brief",
  syncState: "local",
};

let syncTimer = null;

const viewMeta = {
  home: {
    label: "首页",
    title: "PC 首页总览",
    description:
      "首页更适合承接入口分发、推荐专题和最近学习，不再承担底部 tab 那种轻量切换角色。",
  },
  content: {
    label: "内容",
    title: "PC 内容工作台",
    description:
      "内容页是核心：左侧承接学段、学科和章节树，中间承接场景画布，右侧承接说明、笔记和同步状态。",
  },
  study: {
    label: "学习",
    title: "PC 学习中心",
    description:
      "学习页更像个人学习工作区，重点放最近学习、复习队列、本地记录和同步入口。",
  },
  me: {
    label: "我的",
    title: "PC 个人工作区",
    description:
      "我的页不只是设置页，更要承担偏好、本地数据、同步中心和后续账号能力的管理。",
  },
};

const syncMeta = {
  local: {
    label: "仅本地",
    className: "is-local",
    title: "当前仅本地保存",
    copy: "学习记录、实验参数与偏好先落本地，适合当前冷启动阶段。",
  },
  syncing: {
    label: "同步中",
    className: "is-syncing",
    title: "正在模拟同步",
    copy: "当前正在把本地记录整理为可同步批次，后续可接入正式云端。",
  },
  synced: {
    label: "已同步",
    className: "is-synced",
    title: "已完成一次同步",
    copy: "本地与云端视图已对齐，后续可继续补冲突处理和版本合并能力。",
  },
};

const catalog = {
  junior: {
    physics: {
      name: "物理",
      meta: "实验 + 动画 + 图解",
      description: "初中物理先承接运动、力、电学和光学等高可视化内容。",
      chapters: [
        {
          id: "motion",
          name: "运动与力",
          summary: "从速度、位移到受力的基础教学场景。",
          scenes: [
            {
              id: "motion-lab",
              title: "速度与位移观察台",
              type: "实验",
              summary: "把速度变化、位移刻度和运动轨迹放进一个可交互画布。",
              status: "首批内容",
              metrics: [
                { label: "课时时长", value: "12 min", meta: "适合单节微课" },
                { label: "交互层级", value: "2 层", meta: "先轻后重" },
                { label: "复习价值", value: "高", meta: "适合反复回看" },
                { label: "默认模式", value: "2D", meta: "先不接 3D" },
              ],
              goals: [
                "把速度和位移的关系直接映射到同一画布。",
                "支持暂停、回放和关键帧对照。",
                "后续可叠加题型变化和易错点提示。",
              ],
              notes: [
                "适合做初中物理第一批展示型内容。",
                "可以直接引出路程、速度和时间三者关系。",
                "后续接入本地学习记录时，优先保存倍速和回放节点。",
              ],
              sync: [
                "本地记录最近一次回放位置。",
                "记录是否已加入复习列表。",
                "保留场景参数与默认视角设置。",
              ],
              layers: ["轨迹", "刻度", "回放"],
              insights: [
                { title: "主观察点", copy: "把时间轴和位移标尺对齐，帮助学生直接看到位移累计。" },
                { title: "控件密度", copy: "保留少量按钮，避免初次学习时被控制项干扰。" },
                { title: "适配策略", copy: "PC 保留完整控件，H5 只保留主播放和关键切换。" },
                { title: "后续延展", copy: "可接匀速、变速和加速度专题。" },
              ],
            },
            {
              id: "force-start",
              title: "受力入门拆解板",
              type: "图解",
              summary: "以基础受力对象为核心，逐步拆解方向与大小。",
              status: "规划中",
              metrics: [
                { label: "课时时长", value: "10 min", meta: "图解型内容" },
                { label: "交互层级", value: "1 层", meta: "先做轻交互" },
                { label: "复习价值", value: "中高", meta: "适合错题回看" },
                { label: "默认模式", value: "2D", meta: "图解优先" },
              ],
              goals: [
                "帮助学生先认识常见力的方向。",
                "降低抽象符号带来的理解门槛。",
                "为高中力学建模预热。",
              ],
              notes: [
                "适合作为初高衔接内容。",
                "可以与题目讲解页联动。",
                "后续可接操作台版本。",
              ],
              sync: [
                "记录是否完成首次浏览。",
                "本地保存标注开关状态。",
                "同步后可参与个性化推荐。",
              ],
              layers: ["力线", "方向", "标注"],
              insights: [
                { title: "内容优先级", copy: "先看方向，再看大小，最后才进入多力叠加。" },
                { title: "画布策略", copy: "初中阶段不做太重的数据面板，优先保留讲解区。" },
                { title: "联动空间", copy: "可和错题解析、课堂笔记联动。" },
                { title: "H5 折叠", copy: "标注层在 H5 可折叠为下拉面板。" },
              ],
            },
          ],
        },
        {
          id: "electricity",
          name: "电学基础",
          summary: "先承接电路结构、串并联与欧姆定律基础。",
          scenes: [
            {
              id: "circuit-lab",
              title: "串并联电路观察台",
              type: "实验",
              summary: "通过灯泡、电源和开关状态变化理解电路连接关系。",
              status: "规划中",
              metrics: [
                { label: "课时时长", value: "14 min", meta: "实验观察类" },
                { label: "交互层级", value: "2 层", meta: "开关 + 对比" },
                { label: "复习价值", value: "高", meta: "适合反复验证" },
                { label: "默认模式", value: "2D", meta: "电路图优先" },
              ],
              goals: ["对比串并联差异", "支持开关状态切换", "保留实验结论区"],
              notes: ["后续可连接练习题。", "适合配图解和结果对照。", "先不做复杂电流动画。"],
              sync: ["记录最后一次电路组合。", "同步后保留实验进度。", "保存重点标记。"],
              layers: ["电路", "状态", "结论"],
              insights: [
                { title: "第一屏", copy: "实验画布和结论区要同时可见。" },
                { title: "操作重点", copy: "开关和连接线是最核心的交互入口。" },
                { title: "视觉策略", copy: "电流效果先弱化，避免视觉噪音。" },
                { title: "延展方向", copy: "后续可接欧姆定律实验专题。" },
              ],
            },
          ],
        },
      ],
    },
    math: {
      name: "数学",
      meta: "函数 + 几何 + 推导",
      description: "初中数学优先承接函数图像、平面几何和动态推导。",
      chapters: [
        {
          id: "geometry",
          name: "平面几何",
          summary: "通过拖拽和辅助线理解图形关系。",
          scenes: [
            {
              id: "triangle-lab",
              title: "三角形关系观察板",
              type: "图解",
              summary: "动态观察边角关系和辅助线变化。",
              status: "规划中",
              metrics: [
                { label: "课时时长", value: "11 min", meta: "单专题" },
                { label: "交互层级", value: "2 层", meta: "拖拽 + 标注" },
                { label: "复习价值", value: "高", meta: "适合刷题前复看" },
                { label: "默认模式", value: "2D", meta: "几何图优先" },
              ],
              goals: ["理解边角联动", "动态观察辅助线", "沉淀典型变式"],
              notes: ["右侧笔记区可以直接写证明思路。", "后续适合连接 AI 讲解。", "先做基础高频题型。"],
              sync: ["保存最近查看的变式。", "记录是否加入收藏。", "同步笔记与截图。"],
              layers: ["图形", "辅助线", "推导"],
              insights: [
                { title: "主画布", copy: "需要足够大的留白支持图形拖拽。" },
                { title: "笔记联动", copy: "几何更适合右侧同时出现证明要点。" },
                { title: "H5 策略", copy: "图形区优先，其余信息下沉。" },
                { title: "扩展能力", copy: "后续可接空间几何过渡。" },
              ],
            },
          ],
        },
      ],
    },
    chemistry: {
      name: "化学",
      meta: "结构 + 变化 + 实验",
      description: "初中化学先承接基础实验流程与结构认知。",
      chapters: [
        {
          id: "basic-lab",
          name: "基础实验",
          summary: "优先做可视化较强的实验流程和安全认知。",
          scenes: [
            {
              id: "burn-lab",
              title: "燃烧实验流程板",
              type: "专题",
              summary: "用流程图和步骤卡形式理解实验过程。",
              status: "规划中",
              metrics: [
                { label: "课时时长", value: "9 min", meta: "流程型内容" },
                { label: "交互层级", value: "1 层", meta: "步骤切换" },
                { label: "复习价值", value: "中高", meta: "适合考前速览" },
                { label: "默认模式", value: "2D", meta: "流程优先" },
              ],
              goals: ["看懂实验顺序", "识别关键安全点", "理解结果与现象"],
              notes: ["适合做成步骤卡。", "后续可以叠加实验视频。", "先保持轻量。"],
              sync: ["记录已掌握步骤。", "保存错题关联。", "同步实验笔记。"],
              layers: ["步骤", "现象", "结论"],
              insights: [
                { title: "内容形式", copy: "化学初期更适合流程板，不必急于做复杂 3D。" },
                { title: "安全提示", copy: "把危险提示放进右侧上下文区。" },
                { title: "延展路径", copy: "后续可接分子结构和反应过程动画。" },
                { title: "课堂适配", copy: "适合作为课前预习和课后复盘。" },
              ],
            },
          ],
        },
      ],
    },
    memory: {
      name: "记忆",
      meta: "卡片 + 时间线 + 归纳",
      description: "记忆教学优先承接时间线、分类图和复习卡片。",
      chapters: [
        {
          id: "timeline",
          name: "时间线记忆",
          summary: "以时间线和节点卡为主的轻交互场景。",
          scenes: [
            {
              id: "dynasty-board",
              title: "朝代时间线工作板",
              type: "记忆",
              summary: "通过节点和阶段块建立整体时间感。",
              status: "规划中",
              metrics: [
                { label: "课时时长", value: "8 min", meta: "速览型内容" },
                { label: "交互层级", value: "1 层", meta: "节点浏览" },
                { label: "复习价值", value: "高", meta: "非常适合回顾" },
                { label: "默认模式", value: "2D", meta: "时间线优先" },
              ],
              goals: ["建立整体时间顺序", "快速定位重点节点", "支持复习卡联动"],
              notes: ["适合做人文和记忆专项。", "后续可接抽认卡。", "也可服务英语词汇链。"],
              sync: ["记录掌握状态。", "同步复习计划。", "保存自定义标记。"],
              layers: ["时间线", "节点", "卡片"],
              insights: [
                { title: "主任务", copy: "记忆类内容更注重结构总览而不是复杂参数。" },
                { title: "布局策略", copy: "PC 适合左时间轴、右详情联动。" },
                { title: "复用价值", copy: "可迁移到文史、英语和知识归纳场景。" },
                { title: "H5 折叠", copy: "时间线在手机上改成竖向单列。" },
              ],
            },
          ],
        },
      ],
    },
  },
  senior: {
    physics: {
      name: "物理",
      meta: "建模 + 实验 + 图解",
      description: "高中物理优先承接力学、电磁和更复杂的实验建模场景。",
      chapters: [
        {
          id: "mechanics",
          name: "力学建模",
          summary: "受力、位移、速度与能量的核心工作台。",
          scenes: [
            {
              id: "force-lab",
              title: "受力分析实验台",
              type: "实验",
              summary: "把受力拆解、向量方向与运动状态放进同一工作台。",
              status: "核心场景",
              metrics: [
                { label: "课时时长", value: "18 min", meta: "适合专题型微课" },
                { label: "交互层级", value: "3 层", meta: "场景、参数、结论" },
                { label: "复习价值", value: "高", meta: "适合长期积累" },
                { label: "默认模式", value: "2D + 数据", meta: "后续可接 3D" },
              ],
              goals: [
                "拆分重力、支持力、摩擦力的方向关系。",
                "把受力图、参数区和结论区放在一个工作台里。",
                "为后续题型变式和实验参数记录预留结构。",
              ],
              notes: [
                "这是当前 PC 工作台最适合作为首页样板的内容页。",
                "中区优先画布和结论，右区放讲解与笔记。",
                "后续接本地数据时，先保存最近参数与最近一次进入点。",
              ],
              sync: [
                "本地保存实验参数草稿。",
                "记录是否已加入复习计划。",
                "同步后用于跨端恢复进度和笔记。",
              ],
              layers: ["受力图", "参数层", "结论层"],
              insights: [
                { title: "主信息层", copy: "第一屏必须同时看到场景标题、关键参数和结论入口。" },
                { title: "交互密度", copy: "PC 可以容纳更多控制项，但仍要保持三层以内的点击深度。" },
                { title: "数据策略", copy: "先本地保存参数、草稿和最近一次停留位置，再考虑同步。" },
                { title: "H5 折叠", copy: "右侧笔记和同步区在 H5 下沉，主画布和结论区优先保留。" },
              ],
            },
            {
              id: "projectile-view",
              title: "平抛运动分层视图",
              type: "图解",
              summary: "把水平、竖直两个方向的运动关系拆成可切换层。",
              status: "第二优先级",
              metrics: [
                { label: "课时时长", value: "15 min", meta: "图解型专题" },
                { label: "交互层级", value: "2 层", meta: "图层切换" },
                { label: "复习价值", value: "高", meta: "易错点密集" },
                { label: "默认模式", value: "2D", meta: "轨迹优先" },
              ],
              goals: [
                "把分运动与合运动放进同一视图。",
                "用层级切换代替重复讲解。",
                "支撑题型变式的快速对照。",
              ],
              notes: [
                "适合在内容工作台中做副场景卡。",
                "可接简化参数输入。",
                "优先沉淀错题联动能力。",
              ],
              sync: [
                "保存最近选择的图层。",
                "记录错题标签和复习状态。",
                "同步后用于多端继续学习。",
              ],
              layers: ["水平分量", "竖直分量", "合轨迹"],
              insights: [
                { title: "讲解策略", copy: "把两个分量拆成可独立聚焦的层级，更适合 PC 多区布局。" },
                { title: "信息密度", copy: "参数不宜过多，优先让轨迹和结论易读。" },
                { title: "右面板", copy: "适合放常见误区和解题提醒。" },
                { title: "移动折叠", copy: "H5 下保留轨迹主区，其余层级变抽屉。" },
              ],
            },
            {
              id: "energy-route",
              title: "动能与势能转换板",
              type: "专题",
              summary: "通过阶段节点理解能量在不同过程中的变化关系。",
              status: "可扩展",
              metrics: [
                { label: "课时时长", value: "16 min", meta: "专题型内容" },
                { label: "交互层级", value: "2 层", meta: "阶段切换" },
                { label: "复习价值", value: "中高", meta: "适合总结" },
                { label: "默认模式", value: "2D + 卡片", meta: "流程表达" },
              ],
              goals: [
                "帮助学生理解能量变化链。",
                "把公式和情境放在同一工作台。",
                "服务题型归纳和复盘。",
              ],
              notes: [
                "适合做成阶段卡片 + 结论板。",
                "后续可叠加简单 3D 斜面场景。",
                "更适合专题总结页。",
              ],
              sync: [
                "保存阶段节点浏览历史。",
                "本地记录已完成的专题总结。",
                "同步笔记与阶段标记。",
              ],
              layers: ["阶段", "公式", "结论"],
              insights: [
                { title: "布局方式", copy: "适合横向阶段卡串联，PC 表达会更舒展。" },
                { title: "题型归纳", copy: "可以配右侧模板笔记沉淀公式使用条件。" },
                { title: "场景延展", copy: "后续可接机械能守恒和功能关系。" },
                { title: "H5 优先级", copy: "阶段卡保留，公式区折叠。" },
              ],
            },
          ],
        },
        {
          id: "electromagnetism",
          name: "电磁专题",
          summary: "电场、磁场和电路综合关系的中高密度内容页。",
          scenes: [
            {
              id: "field-board",
              title: "电场线观察板",
              type: "图解",
              summary: "通过等势区和方向线理解电场分布。",
              status: "规划中",
              metrics: [
                { label: "课时时长", value: "14 min", meta: "图解 + 结论" },
                { label: "交互层级", value: "2 层", meta: "图层切换" },
                { label: "复习价值", value: "中高", meta: "概念密集" },
                { label: "默认模式", value: "2D", meta: "图解优先" },
              ],
              goals: ["理解方向与强弱", "引出等势面概念", "降低抽象门槛"],
              notes: ["更适合图解与渐进讲解。", "后续可加入参数拖动。", "先不做复杂 3D。"],
              sync: ["记录上次图层。", "保存批注。", "同步重点标记。"],
              layers: ["场线", "强弱", "等势"],
              insights: [
                { title: "认知策略", copy: "电磁类内容要先把抽象关系变成视觉结构。" },
                { title: "布局重点", copy: "图解区和解释区要紧密联动。" },
                { title: "后续能力", copy: "可逐步加入参数拖动与题型对照。" },
                { title: "移动适配", copy: "优先保留图解主画布和一句话结论。" },
              ],
            },
          ],
        },
      ],
    },
    math: {
      name: "数学",
      meta: "函数 + 解析 + 空间",
      description: "高中数学适合承接函数图像、解析几何和空间想象场景。",
      chapters: [
        {
          id: "functions",
          name: "函数图像",
          summary: "适合做函数变化和参数联动的 PC 工作台。",
          scenes: [
            {
              id: "curve-board",
              title: "函数参数联动画板",
              type: "图解",
              summary: "通过参数滑动观察图像变化与性质总结。",
              status: "规划中",
              metrics: [
                { label: "课时时长", value: "16 min", meta: "图像专题" },
                { label: "交互层级", value: "3 层", meta: "参数、图像、结论" },
                { label: "复习价值", value: "高", meta: "题型覆盖广" },
                { label: "默认模式", value: "2D", meta: "坐标系优先" },
              ],
              goals: ["把参数变化和图像关系绑定", "沉淀性质结论", "支持题型变式对照"],
              notes: ["数学也非常适合 PC 工作台形态。", "坐标区需要足够大。", "右面板可承接证明思路。"],
              sync: ["保存最近参数。", "记录错题关注点。", "同步笔记和标记。"],
              layers: ["坐标", "曲线", "性质"],
              insights: [
                { title: "PC 优势", copy: "函数图像在桌面端能同时展示参数区、图像区和结论区。" },
                { title: "交互路径", copy: "参数滑动必须低延迟，结论区同步更新。" },
                { title: "信息组织", copy: "保持数学表达清爽，不堆砌装饰。" },
                { title: "H5 折叠", copy: "参数区折叠到底部抽屉。" },
              ],
            },
          ],
        },
      ],
    },
    chemistry: {
      name: "化学",
      meta: "结构 + 过程 + 模型",
      description: "高中化学后续可逐步承接分子结构和反应过程可视化。",
      chapters: [
        {
          id: "molecule",
          name: "分子结构",
          summary: "为后续 3D 模型预留入口，但当前先用 2D/2.5D 表达。",
          scenes: [
            {
              id: "bond-board",
              title: "键角与结构观察台",
              type: "专题",
              summary: "用分层结构和重点标注理解分子形态。",
              status: "规划中",
              metrics: [
                { label: "课时时长", value: "13 min", meta: "结构观察" },
                { label: "交互层级", value: "2 层", meta: "结构 + 标注" },
                { label: "复习价值", value: "中高", meta: "适合对照记忆" },
                { label: "默认模式", value: "2D / 2.5D", meta: "3D 后接" },
              ],
              goals: ["先看懂结构，不急于重 3D", "突出重点键角与电子排布", "服务高频考点"],
              notes: ["化学的 3D 可以后接。", "第一步先把结构关系讲清。", "适合先做卡片式场景。"],
              sync: ["记录最近查看结构。", "同步记忆卡片。", "保存标注重点。"],
              layers: ["结构", "标注", "结论"],
              insights: [
                { title: "节奏控制", copy: "先用平面和半立体表达，后续再接真实 3D 模型。" },
                { title: "内容顺序", copy: "先结构，再性质，再反应。" },
                { title: "工作台角色", copy: "右侧可放记忆点和常见误区。" },
                { title: "H5 处理", copy: "结构区保留，说明区折叠。" },
              ],
            },
          ],
        },
      ],
    },
    memory: {
      name: "记忆",
      meta: "结构化 + 归纳 + 复习",
      description: "记忆教学也走工作台模式，但更强调结构图、复习卡和总结。",
      chapters: [
        {
          id: "framework",
          name: "框架记忆",
          summary: "适合知识树、时间线和概念图的桌面排布。",
          scenes: [
            {
              id: "framework-map",
              title: "知识框架地图",
              type: "记忆",
              summary: "用结构树和卡片面板沉淀复杂知识框架。",
              status: "规划中",
              metrics: [
                { label: "课时时长", value: "9 min", meta: "总览型内容" },
                { label: "交互层级", value: "2 层", meta: "结构 + 卡片" },
                { label: "复习价值", value: "高", meta: "适合阶段复盘" },
                { label: "默认模式", value: "2D", meta: "结构图优先" },
              ],
              goals: ["帮助学生先看全局结构", "建立知识节点关系", "支持复习计划联动"],
              notes: ["文科和理科知识都能复用这种工作台。", "后续适合接抽认卡。", "PC 更适合大框架展示。"],
              sync: ["记录掌握节点。", "同步复习计划。", "保存卡片收藏。"],
              layers: ["结构图", "节点卡", "复习点"],
              insights: [
                { title: "复用性", copy: "这一套结构也可以服务英语词汇和历史专题。" },
                { title: "布局方式", copy: "PC 适合左结构树、中详情、右复习计划。" },
                { title: "产品价值", copy: "能体现不仅是理科工具，而是通用教学工作台。" },
                { title: "H5 策略", copy: "结构树折叠为分层入口。" },
              ],
            },
          ],
        },
      ],
    },
  },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getStageLabel() {
  return state.stage === "junior" ? "初中" : "高中";
}

function getStageCatalog() {
  return catalog[state.stage];
}

function getCurrentSubject() {
  return getStageCatalog()[state.subject];
}

function getCurrentChapter() {
  return getCurrentSubject().chapters.find((chapter) => chapter.id === state.chapter);
}

function getVisibleScenes() {
  const chapter = getCurrentChapter();
  if (!chapter) {
    return [];
  }

  if (state.contentType === "全部") {
    return chapter.scenes;
  }

  const filtered = chapter.scenes.filter((scene) => scene.type === state.contentType);
  return filtered.length ? filtered : chapter.scenes;
}

function getCurrentScene() {
  return getVisibleScenes().find((scene) => scene.id === state.scene);
}

function getContentTypes() {
  const types = new Set();
  getCurrentSubject().chapters.forEach((chapter) => {
    chapter.scenes.forEach((scene) => {
      types.add(scene.type);
    });
  });

  return ["全部", ...Array.from(types)];
}

function ensureSelection() {
  const stageCatalog = getStageCatalog();
  if (!stageCatalog[state.subject]) {
    state.subject = Object.keys(stageCatalog)[0];
  }

  const subject = getCurrentSubject();
  if (!subject.chapters.some((chapter) => chapter.id === state.chapter)) {
    state.chapter = subject.chapters[0].id;
  }

  if (!getContentTypes().includes(state.contentType)) {
    state.contentType = "全部";
  }

  const visibleScenes = getVisibleScenes();
  if (!visibleScenes.some((scene) => scene.id === state.scene)) {
    state.scene = visibleScenes[0].id;
  }
}

function renderViewSwitches() {
  const node = document.getElementById("view-switches");
  node.innerHTML = Object.entries(viewMeta)
    .map(
      ([id, meta]) => `
        <button class="switch-chip ${id === state.view ? "is-active" : ""}" data-view="${id}">
          ${escapeHtml(meta.label)}
        </button>
      `
    )
    .join("");
}

function renderStageSwitches() {
  const node = document.getElementById("stage-switches");
  node.innerHTML = `
    <button class="switch-chip ${state.stage === "junior" ? "is-active" : ""}" data-stage="junior">初中</button>
    <button class="switch-chip ${state.stage === "senior" ? "is-active" : ""}" data-stage="senior">高中</button>
  `;
}

function renderSubjectSwitches() {
  const node = document.getElementById("subject-switches");
  node.innerHTML = Object.entries(getStageCatalog())
    .map(
      ([id, subject]) => `
        <button class="subject-control-item ${id === state.subject ? "is-active" : ""}" data-subject="${id}">
          <span class="subject-control-name">${escapeHtml(subject.name)}</span>
          <span class="subject-control-meta">${escapeHtml(subject.meta)}</span>
        </button>
      `
    )
    .join("");
}

function renderViewDescription() {
  document.getElementById("view-description").textContent = viewMeta[state.view].description;
}

function renderSelectionSummary() {
  const subject = getCurrentSubject();
  const chapter = getCurrentChapter();
  const scene = getCurrentScene();
  const node = document.getElementById("selection-summary");

  node.innerHTML = `
    <div class="summary-item">
      <span>当前页</span>
      <strong>${escapeHtml(viewMeta[state.view].label)}</strong>
    </div>
    <div class="summary-item">
      <span>学段 / 学科</span>
      <strong>${escapeHtml(getStageLabel())} / ${escapeHtml(subject.name)}</strong>
    </div>
    <div class="summary-item">
      <span>当前章节</span>
      <strong>${escapeHtml(chapter.name)}</strong>
    </div>
    <div class="summary-item">
      <span>当前场景</span>
      <strong>${escapeHtml(scene.title)}</strong>
    </div>
  `;
}

function renderPreviewHeader() {
  const subject = getCurrentSubject();
  const chapter = getCurrentChapter();
  const scene = getCurrentScene();
  const meta = viewMeta[state.view];

  document.getElementById("preview-title").textContent =
    state.view === "content"
      ? `${meta.title} · ${scene.title}`
      : `${meta.title} · ${getStageLabel()} ${subject.name}`;

  document.getElementById("preview-copy").textContent =
    state.view === "content"
      ? `${chapter.summary} 当前默认展示 "${scene.title}"，用它作为 Web 端内容工作台的首个高保真方向。`
      : meta.description;

  document.getElementById("preview-badges").innerHTML = `
    <span class="preview-badge is-highlight">1440 × 960</span>
    <span class="preview-badge">PC 优先</span>
    <span class="preview-badge">${escapeHtml(getStageLabel())}</span>
    <span class="preview-badge">${escapeHtml(subject.name)}</span>
    <span class="preview-badge">${escapeHtml(scene.type)}</span>
  `;
}

function renderSidebar() {
  const subject = getCurrentSubject();
  const chapters = subject.chapters;
  const types = getContentTypes();

  return `
    <aside class="workspace-sidebar">
      <section class="sidebar-card">
        <div class="sidebar-head">
          <div>
            <p class="sidebar-eyebrow">课程导航</p>
            <h3 class="sidebar-title">${escapeHtml(getStageLabel())} · ${escapeHtml(subject.name)}</h3>
          </div>
          <span class="tiny-pill">${escapeHtml(subject.meta)}</span>
        </div>
        <p class="sidebar-copy">${escapeHtml(subject.description)}</p>
      </section>

      <section class="sidebar-card">
        <p class="sidebar-eyebrow">学段切换</p>
        <div class="stage-toggle" style="margin-top: 14px;">
          <button class="stage-button ${state.stage === "junior" ? "is-active" : ""}" data-stage="junior">初中</button>
          <button class="stage-button ${state.stage === "senior" ? "is-active" : ""}" data-stage="senior">高中</button>
        </div>
      </section>

      <section class="sidebar-card">
        <p class="sidebar-eyebrow">学科入口</p>
        <div class="subject-list" style="margin-top: 14px;">
          ${Object.entries(getStageCatalog())
            .map(
              ([id, item]) => `
                <button class="subject-entry ${id === state.subject ? "is-active" : ""}" data-subject="${id}">
                  <span class="subject-name">${escapeHtml(item.name)}</span>
                  <span class="subject-meta">${escapeHtml(item.meta)}</span>
                </button>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="sidebar-card">
        <div class="sidebar-head">
          <div>
            <p class="sidebar-eyebrow">章节树</p>
            <h3 class="sidebar-title">当前章节结构</h3>
          </div>
        </div>
        <div class="chapter-list" style="margin-top: 14px;">
          ${chapters
            .map(
              (chapter) => `
                <button class="chapter-item ${chapter.id === state.chapter ? "is-active" : ""}" data-chapter="${chapter.id}">
                  <div>
                    <span class="chapter-name">${escapeHtml(chapter.name)}</span>
                    <span class="chapter-meta">${escapeHtml(chapter.summary)}</span>
                  </div>
                  <span class="chapter-count">${chapter.scenes.length}</span>
                </button>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="sidebar-card">
        <p class="sidebar-eyebrow">内容类型</p>
        <div class="type-row" style="margin-top: 14px;">
          ${types
            .map(
              (type) => `
                <button class="type-chip ${type === state.contentType ? "is-active" : ""}" data-type="${escapeHtml(type)}">
                  ${escapeHtml(type)}
                </button>
              `
            )
            .join("")}
        </div>
      </section>
    </aside>
  `;
}

function renderMetricStrip(scene) {
  return `
    <section class="metric-strip">
      ${scene.metrics
        .map(
          (metric) => `
            <article class="metric-card">
              <p class="mini-label">${escapeHtml(metric.label)}</p>
              <div class="metric-value">${escapeHtml(metric.value)}</div>
              <p class="metric-meta">${escapeHtml(metric.meta)}</p>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderHeroPanel() {
  const subject = getCurrentSubject();
  const chapter = getCurrentChapter();
  const scene = getCurrentScene();
  const sync = syncMeta[state.syncState];

  return `
    <section class="hero-panel">
      <div class="hero-row">
        <div>
          <p class="section-label">${escapeHtml(getStageLabel())} / ${escapeHtml(subject.name)} / ${escapeHtml(chapter.name)}</p>
          <h2 class="hero-title">${escapeHtml(scene.title)}</h2>
          <p class="hero-copy">${escapeHtml(scene.summary)}</p>
        </div>
        <span class="badge-pill is-accent">${escapeHtml(scene.status)}</span>
      </div>
      <div class="hero-meta">
        <span class="badge-pill">${escapeHtml(scene.type)}</span>
        <span class="badge-pill">${escapeHtml(sync.label)}</span>
        <span class="badge-pill">本地优先</span>
        <span class="badge-pill">后续可接 PixiJS / Three.js</span>
      </div>
      <div class="action-row" style="margin-top: 18px;">
        <button class="action-button is-primary" data-view="content">进入内容工作台</button>
        <button class="action-button is-secondary" data-context="notes">查看右侧笔记区</button>
        <button class="action-button is-secondary" data-sync-action="start">模拟一次同步</button>
      </div>
    </section>
  `;
}

function renderContentMain() {
  const chapter = getCurrentChapter();
  const scene = getCurrentScene();
  const visibleScenes = getVisibleScenes();

  return `
    ${renderHeroPanel()}
    ${renderMetricStrip(scene)}

    <section class="content-grid">
      <article class="visual-panel">
        <div class="section-head">
          <div>
            <p class="section-label">主画布</p>
            <h3 class="section-title">${escapeHtml(scene.title)}</h3>
          </div>
          <div class="pill-row">
            ${scene.layers
              .map((layer) => `<span class="tiny-pill">${escapeHtml(layer)}</span>`)
              .join("")}
          </div>
        </div>

        <div class="visual-stage">
          <div class="visual-grid-backdrop"></div>
          <div class="visual-curve is-a"></div>
          <div class="visual-curve is-b"></div>
          <div class="visual-core"></div>
          ${scene.layers
            .slice(0, 4)
            .map(
              (layer, index) => `
                <div class="floating-chip is-${index + 1}">
                  ${escapeHtml(layer)}
                </div>
              `
            )
            .join("")}
        </div>

        <div class="insight-list">
          ${scene.insights
            .map(
              (item) => `
                <div class="insight-item">
                  <strong>${escapeHtml(item.title)}</strong>
                  <span>${escapeHtml(item.copy)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <aside class="scene-list-panel">
        <div class="section-head">
          <div>
            <p class="section-label">场景清单</p>
            <h3 class="section-title">${escapeHtml(chapter.name)}</h3>
          </div>
          <span class="section-link">${visibleScenes.length} 个场景</span>
        </div>
        <div class="scene-list" style="margin-top: 16px;">
          ${visibleScenes
            .map(
              (item) => `
                <button class="scene-card ${item.id === state.scene ? "is-active" : ""}" data-scene="${item.id}">
                  <div class="scene-card-head">
                    <div>
                      <span class="scene-title">${escapeHtml(item.title)}</span>
                      <span class="scene-meta">${escapeHtml(item.type)} / ${escapeHtml(item.status)}</span>
                    </div>
                    <span class="tiny-pill">${escapeHtml(item.type)}</span>
                  </div>
                  <p class="card-copy">${escapeHtml(item.summary)}</p>
                </button>
              `
            )
            .join("")}
        </div>
      </aside>
    </section>

    <section class="section-card">
      <div class="section-head">
        <div>
          <p class="section-label">章节路线</p>
          <h3 class="section-title">${escapeHtml(chapter.name)} 相关工作台</h3>
        </div>
        <span class="section-link">后续扩展</span>
      </div>
      <div class="section-card-grid is-two">
        ${getCurrentSubject().chapters
          .map(
            (item) => `
              <button class="overview-card ${item.id === state.chapter ? "is-active" : ""}" data-chapter="${item.id}">
                <strong>${escapeHtml(item.name)}</strong>
                <p class="overview-meta">${escapeHtml(item.summary)}</p>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderHomeMain() {
  const subjects = Object.values(getStageCatalog());
  const subject = getCurrentSubject();

  return `
    <section class="hero-panel">
      <div class="hero-row">
        <div>
          <p class="section-label">首页总览 / ${escapeHtml(getStageLabel())}</p>
          <h2 class="hero-title">把 Web 首页做成教学工作台入口，而不是简单 banner</h2>
          <p class="hero-copy">
            PC 首页重点承接推荐专题、最近学习、学科入口和内容工作台快捷进入，不再按手机思路做轻量底部切换。
          </p>
        </div>
        <span class="badge-pill is-accent">PC 入口页</span>
      </div>
      <div class="action-row" style="margin-top: 18px;">
        <button class="action-button is-primary" data-view="content">进入内容工作台</button>
        <button class="action-button is-secondary" data-subject="${escapeHtml(state.subject)}">保留当前学科</button>
      </div>
    </section>

    <section class="metric-strip">
      <article class="metric-card">
        <p class="mini-label">当前学段学科</p>
        <div class="metric-value">${subjects.length}</div>
        <p class="metric-meta">首页建议直接展示学科入口与推荐专题。</p>
      </article>
      <article class="metric-card">
        <p class="mini-label">当前学科章节</p>
        <div class="metric-value">${subject.chapters.length}</div>
        <p class="metric-meta">按章节进入内容工作台，减少层级绕路。</p>
      </article>
      <article class="metric-card">
        <p class="mini-label">本地记录</p>
        <div class="metric-value">28</div>
        <p class="metric-meta">首页也要接最近学习和继续学习入口。</p>
      </article>
      <article class="metric-card">
        <p class="mini-label">推荐模式</p>
        <div class="metric-value">工作台</div>
        <p class="metric-meta">把场景入口直接放首页，而不是只放资讯卡片。</p>
      </article>
    </section>

    <section class="home-grid">
      <article class="section-card">
        <div class="section-head">
          <div>
            <p class="section-label">学科入口</p>
            <h3 class="section-title">首页建议直接可切学科</h3>
          </div>
          <span class="section-link">当前学段</span>
        </div>
        <div class="section-card-grid is-two">
          ${Object.entries(getStageCatalog())
            .map(
              ([id, item]) => `
                <button class="overview-card ${id === state.subject ? "is-active" : ""}" data-subject="${id}">
                  <strong>${escapeHtml(item.name)}</strong>
                  <p class="overview-meta">${escapeHtml(item.description)}</p>
                </button>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="section-card">
        <div class="section-head">
          <div>
            <p class="section-label">推荐专题</p>
            <h3 class="section-title">当前优先推进</h3>
          </div>
        </div>
        <div class="record-list" style="margin-top: 16px;">
          ${getCurrentSubject().chapters
            .map(
              (chapter) => `
                <button class="record-item" data-chapter="${chapter.id}" data-view="content">
                  <strong>${escapeHtml(chapter.name)}</strong>
                  <p class="record-meta">${escapeHtml(chapter.summary)}</p>
                </button>
              `
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function renderStudyMain() {
  return `
    <section class="hero-panel">
      <div class="hero-row">
        <div>
          <p class="section-label">学习中心</p>
          <h2 class="hero-title">学习页更像个人学习工作区</h2>
          <p class="hero-copy">
            在 PC 下，学习页要把最近学习、复习队列、实验记录和同步状态组织成一个长期使用的个人工作区。
          </p>
        </div>
        <span class="badge-pill is-accent">本地优先</span>
      </div>
    </section>

    <section class="metric-strip">
      <article class="metric-card">
        <p class="mini-label">连续学习</p>
        <div class="metric-value">6 天</div>
        <p class="metric-meta">强调长期使用，而不是一次性浏览。</p>
      </article>
      <article class="metric-card">
        <p class="mini-label">本地收藏</p>
        <div class="metric-value">28</div>
        <p class="metric-meta">后续同步时要保留收藏和标记。</p>
      </article>
      <article class="metric-card">
        <p class="mini-label">待复习专题</p>
        <div class="metric-value">12</div>
        <p class="metric-meta">学习页需要承接复习任务队列。</p>
      </article>
      <article class="metric-card">
        <p class="mini-label">实验记录</p>
        <div class="metric-value">9</div>
        <p class="metric-meta">参数和草稿都应先落本地。</p>
      </article>
    </section>

    <section class="study-grid">
      <article class="section-card">
        <div class="section-head">
          <div>
            <p class="section-label">最近学习</p>
            <h3 class="section-title">继续学习入口</h3>
          </div>
        </div>
        <div class="record-list" style="margin-top: 16px;">
          <button class="record-item" data-view="content" data-scene="force-lab">
            <strong>受力分析实验台</strong>
            <p class="record-meta">上次学习 2 小时前 / 参数草稿已本地保存</p>
          </button>
          <button class="record-item" data-view="content" data-scene="projectile-view">
            <strong>平抛运动分层视图</strong>
            <p class="record-meta">上次学习 昨天 / 已加入复习</p>
          </button>
        </div>
      </article>

      <article class="section-card">
        <div class="section-head">
          <div>
            <p class="section-label">复习进度</p>
            <h3 class="section-title">学习沉淀条</h3>
          </div>
        </div>
        <div class="overview-card" style="margin-top: 16px;">
          <strong>专题复盘进度</strong>
          <p class="overview-meta">已完成 68%，后续可以把错题、笔记与实验记录串起来。</p>
          <div class="progress-line">
            <div class="progress-fill" style="width: 68%;"></div>
          </div>
        </div>
        <div class="overview-card" style="margin-top: 12px;">
          <strong>本地笔记整理</strong>
          <p class="overview-meta">已整理 52%，后续同步时优先处理笔记与标签。</p>
          <div class="progress-line">
            <div class="progress-fill" style="width: 52%;"></div>
          </div>
        </div>
      </article>
    </section>
  `;
}

function renderMeMain() {
  const sync = syncMeta[state.syncState];

  return `
    <section class="hero-panel">
      <div class="hero-row">
        <div>
          <p class="section-label">个人工作区</p>
          <h2 class="hero-title">把偏好、本地数据和同步中心收拢到同一个页面</h2>
          <p class="hero-copy">
            PC 端“我的”更像管理中心，而不是只有头像和设置。这里要承接偏好、本地数据、后续账号与恢复能力。
          </p>
        </div>
        <span class="badge-pill is-accent">${escapeHtml(sync.label)}</span>
      </div>
    </section>

    <section class="settings-grid">
      <article class="setting-card">
        <p class="mini-label">学习偏好</p>
        <strong>默认高中 · 物理</strong>
        <p class="setting-meta">保留常用学科、主题样式和实验偏好设置。</p>
      </article>
      <article class="setting-card">
        <p class="mini-label">本地数据仓</p>
        <strong>最近 28 条记录</strong>
        <p class="setting-meta">后续这里要能看到本地学习记录、参数、笔记与收藏状态。</p>
      </article>
      <article class="setting-card">
        <p class="mini-label">同步中心</p>
        <strong>${escapeHtml(sync.title)}</strong>
        <p class="setting-meta">${escapeHtml(sync.copy)}</p>
      </article>
      <article class="setting-card">
        <p class="mini-label">恢复与迁移</p>
        <strong>后续保留手动同步</strong>
        <p class="setting-meta">优先支持用户主动同步，而不是默认静默上云。</p>
      </article>
    </section>
  `;
}

function renderMainContent() {
  if (state.view === "home") {
    return renderHomeMain();
  }

  if (state.view === "study") {
    return renderStudyMain();
  }

  if (state.view === "me") {
    return renderMeMain();
  }

  return renderContentMain();
}

function getContextData() {
  const scene = getCurrentScene();

  if (state.view === "content") {
    return {
      briefTitle: "场景说明",
      briefItems: scene.goals,
      notesTitle: "设计笔记",
      notesItems: scene.notes,
      syncItems: scene.sync,
    };
  }

  if (state.view === "home") {
    return {
      briefTitle: "首页布局要点",
      briefItems: [
        "首页承担入口分发、最近学习和推荐专题，不再做成轻量底部切换页。",
        "学科入口和继续学习入口都应直达内容工作台。",
        "首页需要保留本地优先状态与同步提示。",
      ],
      notesTitle: "首页备注",
      notesItems: [
        "首页不宜堆太多营销感轮播，应更像学习驾驶舱。",
        "推荐区和最近学习区应该并列，而不是只放大 banner。",
        "PC 首页优先级高于 H5 首页样式细节。",
      ],
      syncItems: [
        "首页展示最近同步状态即可。",
        "同步入口仍然放在学习页和我的页。",
        "本地数据提醒可以保持轻量。",
      ],
    };
  }

  if (state.view === "study") {
    return {
      briefTitle: "学习域要点",
      briefItems: [
        "学习页优先承接最近学习、复习、收藏和实验记录。",
        "用户的长期沉淀数据应该在这里有稳定入口。",
        "同步中心要与本地数据仓联动，而不是孤立存在。",
      ],
      notesTitle: "学习域备注",
      notesItems: [
        "适合后续做学习热力图、计划板和复习队列。",
        "PC 端可以容纳更多进度信息和对比信息。",
        "H5 只保留高频内容，复杂统计在 PC 展示。",
      ],
      syncItems: [
        "学习记录先本地保存。",
        "同步时优先保障学习历史和收藏不丢失。",
        "后续再处理冲突合并与跨端恢复。",
      ],
    };
  }

  return {
    briefTitle: "个人工作区要点",
    briefItems: [
      "这里承接偏好、本地数据、同步中心和后续账号能力。",
      "不要只做成简单设置页，要能解释当前数据状态。",
      "用户需要知道哪些数据在本地，哪些已经同步。",
    ],
    notesTitle: "我的页备注",
    notesItems: [
      "可以和 shared-assets、品牌配置、个性主题联动。",
      "后续这里还会承接导出、恢复、版本说明等能力。",
      "PC 页面更适合展示详细的本地数据概览。",
    ],
    syncItems: [
      "同步入口建议集中在我的页和学习页。",
      "默认还是本地优先，用户主动触发同步。",
      "同步结果要有清晰反馈和可回看记录。",
    ],
  };
}

function renderContextPanel() {
  const context = getContextData();
  const sync = syncMeta[state.syncState];

  const content =
    state.contextTab === "brief"
      ? `
        <section class="context-block">
          <div class="context-head">
            <div>
              <p class="sidebar-eyebrow">说明区</p>
              <h3 class="context-title">${escapeHtml(context.briefTitle)}</h3>
            </div>
          </div>
          <ul class="context-list">
            ${context.briefItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </section>
      `
      : state.contextTab === "notes"
        ? `
          <section class="context-block">
            <div class="context-head">
              <div>
                <p class="sidebar-eyebrow">笔记区</p>
                <h3 class="context-title">${escapeHtml(context.notesTitle)}</h3>
              </div>
            </div>
            <ul class="context-list">
              ${context.notesItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </section>
        `
        : `
          <section class="sync-card">
            <div class="context-head">
              <div>
                <p class="sidebar-eyebrow">同步区</p>
                <h3 class="context-title">${escapeHtml(sync.title)}</h3>
              </div>
            </div>
            <p class="context-copy">${escapeHtml(sync.copy)}</p>
            <div class="sync-card-status ${escapeHtml(sync.className)}">
              ${escapeHtml(sync.label)} · 当前策略是先把本地数据保存稳定，再开放主动同步。
            </div>
            <ul class="context-list">
              ${context.syncItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
            <div class="sync-actions">
              <button class="action-button is-primary" data-sync-action="start">模拟同步</button>
              <button class="action-button is-secondary" data-sync-action="reset">恢复本地模式</button>
            </div>
          </section>
        `;

  return `
    <aside class="context-panel">
      <div class="context-panel-top">
        <div class="context-tabs">
          <button class="context-tab ${state.contextTab === "brief" ? "is-active" : ""}" data-context="brief">说明</button>
          <button class="context-tab ${state.contextTab === "notes" ? "is-active" : ""}" data-context="notes">笔记</button>
          <button class="context-tab ${state.contextTab === "sync" ? "is-active" : ""}" data-context="sync">同步</button>
        </div>
      </div>
      ${content}
    </aside>
  `;
}

function renderDesktopWindow() {
  const sync = syncMeta[state.syncState];

  document.getElementById("desktop-window").innerHTML = `
    <div class="app-frame">
      <header class="app-topbar">
        <div class="brand-block">
          <div class="brand-mark">ET</div>
          <div>
            <div class="brand-name">Easy Teaching</div>
            <div class="brand-subtitle">PC 可视化教学工作台</div>
          </div>
        </div>
        <nav class="app-nav">
          ${Object.entries(viewMeta)
            .map(
              ([id, meta]) => `
                <button class="nav-button ${id === state.view ? "is-active" : ""}" data-view="${id}">
                  ${escapeHtml(meta.label)}
                </button>
              `
            )
            .join("")}
        </nav>
        <div class="topbar-tools">
          <div class="search-chip">搜索学科、章节、实验、专题</div>
          <span class="sync-pill ${escapeHtml(sync.className)}">${escapeHtml(sync.label)}</span>
          <button class="avatar-chip">Chen</button>
        </div>
      </header>

      <div class="app-body">
        ${renderSidebar()}
        <section class="workspace-main">${renderMainContent()}</section>
        ${renderContextPanel()}
      </div>
    </div>
  `;
}

function render() {
  ensureSelection();
  renderViewSwitches();
  renderStageSwitches();
  renderSubjectSwitches();
  renderViewDescription();
  renderSelectionSummary();
  renderPreviewHeader();
  renderDesktopWindow();
}

function startSync() {
  if (state.syncState === "syncing") {
    return;
  }

  state.syncState = "syncing";
  render();

  clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    state.syncState = "synced";
    render();
  }, 900);
}

function resetSync() {
  clearTimeout(syncTimer);
  state.syncState = "local";
  render();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-view], [data-stage], [data-subject], [data-chapter], [data-scene], [data-context], [data-type], [data-sync-action]");
  if (!target) {
    return;
  }

  if (target.dataset.view) {
    state.view = target.dataset.view;
  }

  if (target.dataset.stage) {
    state.stage = target.dataset.stage;
  }

  if (target.dataset.subject) {
    state.subject = target.dataset.subject;
  }

  if (target.dataset.chapter) {
    state.chapter = target.dataset.chapter;
  }

  if (target.dataset.scene) {
    state.scene = target.dataset.scene;
    state.view = "content";
  }

  if (target.dataset.context) {
    state.contextTab = target.dataset.context;
  }

  if (target.dataset.type) {
    state.contentType = target.dataset.type;
  }

  if (target.dataset.syncAction === "start") {
    startSync();
    return;
  }

  if (target.dataset.syncAction === "reset") {
    resetSync();
    return;
  }

  render();
});

render();
