const state = {
  theme: "bright",
  page: "home",
  stage: "junior",
  subject: "physics",
  filter: "all",
  activeRecord: "force",
  syncState: "local-only",
};

const themeMeta = {
  bright: {
    label: "明亮教育卡片风",
    description: "当前方向以高可读性和教育卡片感为主，适合作为首页、内容页和我的页的基础风格。",
  },
  path: {
    label: "学习路径风",
    description: "当前方向强调学习进度、路径节点和持续成长感，更适合学习页和首页推荐区。",
  },
  lab: {
    label: "轻科技实验室风",
    description: "当前方向加入轻量网格、数据面板和实验室气质，适合实验、图解和可视化内容。",
  },
};

const subjects = [
  { id: "physics", name: "物理", meta: "实验 + 图解 + 可视化" },
  { id: "math", name: "数学", meta: "函数 + 几何 + 推导" },
  { id: "chemistry", name: "化学", meta: "反应 + 结构 + 过程" },
  { id: "memory", name: "记忆", meta: "卡片 + 时间线 + 归纳" },
];

const contentItems = [
  { id: "optics", title: "凸透镜成像规律", type: "实验", stage: "junior", subject: "physics", tag: "光学" },
  { id: "line", title: "光的直线传播", type: "动画", stage: "junior", subject: "physics", tag: "光学" },
  { id: "ohm", title: "欧姆定律探究", type: "实验", stage: "junior", subject: "physics", tag: "电学" },
  { id: "parabola", title: "抛物线与轨迹关系", type: "图解", stage: "senior", subject: "math", tag: "函数" },
  { id: "molecule", title: "分子结构与键角", type: "专题", stage: "senior", subject: "chemistry", tag: "结构" },
  { id: "history", title: "朝代时间线记忆图", type: "记忆", stage: "junior", subject: "memory", tag: "人文" },
];

const records = [
  { id: "force", title: "受力分析专题", score: "82%", meta: "上次学习 2 小时前" },
  { id: "optics", title: "光学实验组", score: "64%", meta: "上次学习 昨天" },
  { id: "timeline", title: "时间线记忆卡", score: "48%", meta: "上次学习 3 天前" },
];

const tabs = [
  { id: "home", label: "首页" },
  { id: "content", label: "内容" },
  { id: "study", label: "学习" },
  { id: "mine", label: "我的" },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderThemeDescription() {
  const descriptionNode = document.getElementById("theme-description");
  const meta = themeMeta[state.theme];
  descriptionNode.textContent = meta.description;
}

function renderThemeSwitches() {
  document.querySelectorAll("#theme-switches .switch-chip").forEach((node) => {
    node.classList.toggle("is-active", node.dataset.theme === state.theme);
  });
}

function renderPageSwitches() {
  document.querySelectorAll("#page-switches .switch-chip").forEach((node) => {
    node.classList.toggle("is-active", node.dataset.page === state.page);
  });
}

function renderTabs() {
  const tabBar = document.getElementById("tab-bar");
  tabBar.innerHTML = tabs
    .map(
      (tab) => `
        <button class="tab-item ${tab.id === state.page ? "is-active" : ""}" data-tab="${tab.id}">
          <span class="tab-icon"></span>
          <span class="tab-label">${escapeHtml(tab.label)}</span>
        </button>
      `
    )
    .join("");
}

function renderHomePage() {
  const stageLabel = state.stage === "junior" ? "初中" : "高中";
  return `
    <div class="page">
      <section class="hero-card">
        <div class="hero-row">
          <div>
            <p class="note-eyebrow">首页 / ${escapeHtml(stageLabel)}</p>
            <h2 class="hero-title">可视化教学，从学段开始组织</h2>
            <p class="hero-subtitle">先按学段切分，再进入学科、章节和实验，适合长期扩展到理科与文科内容。</p>
          </div>
          <span class="badge-pill">4 tab</span>
        </div>
        <div class="chip-row">
          <button class="stage-chip ${state.stage === "junior" ? "is-active" : ""}" data-stage="junior">初中</button>
          <button class="stage-chip ${state.stage === "senior" ? "is-active" : ""}" data-stage="senior">高中</button>
          <button class="stage-chip" data-page-jump="content">进入内容库</button>
        </div>
      </section>

      <section class="surface-card">
        <div class="section-head">
          <div>
            <p class="section-label">学科入口</p>
            <h3 class="section-title">${escapeHtml(stageLabel)}学段下的学科</h3>
          </div>
          <span class="section-link">可扩展</span>
        </div>
        <div class="subject-grid">
          ${subjects
            .map(
              (subject) => `
                <button class="subject-card ${state.subject === subject.id ? "is-active" : ""}" data-subject="${subject.id}">
                  <div class="subject-mark"></div>
                  <h3>${escapeHtml(subject.name)}</h3>
                  <p class="card-copy">${escapeHtml(subject.meta)}</p>
                </button>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="surface-card">
        <div class="section-head">
          <div>
            <p class="section-label">推荐布局</p>
            <h3 class="section-title">首页组合建议</h3>
          </div>
          <span class="section-link">后续运营</span>
        </div>
        ${
          state.theme === "path"
            ? `
            <div class="path-strip">
              <div class="path-node">
                <p class="mini-label">起点</p>
                <strong>${escapeHtml(stageLabel)}学段</strong>
              </div>
              <div class="path-node">
                <p class="mini-label">中段</p>
                <strong>${escapeHtml(subjects.find((item) => item.id === state.subject)?.name || "")}专题</strong>
              </div>
              <div class="path-node">
                <p class="mini-label">继续</p>
                <strong>最近学习</strong>
              </div>
            </div>
          `
            : `
            <div class="mini-grid">
              <div class="mini-panel">
                <p class="mini-label">最近学习</p>
                <div class="mini-value">12</div>
              </div>
              <div class="mini-panel">
                <p class="mini-label">收藏内容</p>
                <div class="mini-value">28</div>
              </div>
            </div>
          `
        }
      </section>
    </div>
  `;
}

function renderContentPage() {
  const filteredItems = contentItems.filter((item) => {
    if (state.filter !== "all" && item.type !== state.filter) {
      return false;
    }

    if (item.stage !== state.stage) {
      return false;
    }

    return true;
  });

  return `
    <div class="page">
      <section class="hero-card">
        <p class="note-eyebrow">内容页</p>
        <h2 class="hero-title">按学段、学科与类型浏览内容</h2>
        <p class="hero-subtitle">tabBar 保持稳定，学段与学科放页面内部切换，更利于长期扩展。</p>
      </section>

      <section class="surface-card">
        <div class="section-head">
          <div>
            <p class="section-label">筛选结构</p>
            <h3 class="section-title">内容库筛选</h3>
          </div>
          <span class="section-link">${state.stage === "junior" ? "初中" : "高中"}</span>
        </div>
        <div class="chip-row">
          <button class="stage-chip ${state.stage === "junior" ? "is-active" : ""}" data-stage="junior">初中</button>
          <button class="stage-chip ${state.stage === "senior" ? "is-active" : ""}" data-stage="senior">高中</button>
          <button class="stage-chip ${state.subject === "physics" ? "is-active" : ""}" data-subject="physics">物理</button>
        </div>
        <div class="filter-row">
          ${["all", "实验", "动画", "图解", "专题", "记忆"]
            .map(
              (filter) => `
                <button class="filter-chip ${state.filter === filter ? "is-active" : ""}" data-filter="${filter}">
                  ${escapeHtml(filter === "all" ? "全部" : filter)}
                </button>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="content-list">
        ${filteredItems
          .map(
            (item) => `
              <button class="list-card ${state.subject === item.subject ? "is-active" : ""}" data-subject="${item.subject}" data-page-jump="study">
                <div class="list-row">
                  <div>
                    <p class="mini-label">${escapeHtml(item.tag)}</p>
                    <h3>${escapeHtml(item.title)}</h3>
                    <p class="card-copy">${escapeHtml(item.type)} / ${item.stage === "junior" ? "初中" : "高中"}</p>
                  </div>
                  <span class="tiny-pill">${escapeHtml(item.type)}</span>
                </div>
              </button>
            `
          )
          .join("")}
      </section>
    </div>
  `;
}

function renderStudyPage() {
  return `
    <div class="page">
      <section class="hero-card">
        <div class="hero-row">
          <div>
            <p class="note-eyebrow">学习页</p>
            <h2 class="hero-title">学习沉淀从本地优先开始</h2>
            <p class="hero-subtitle">记录最近学习、收藏、进度和实验参数，后续再通过同步中心入云。</p>
          </div>
          <span class="badge-pill">${state.stage === "junior" ? "初中" : "高中"}</span>
        </div>
      </section>

      <section class="progress-grid">
        <article class="progress-card">
          <p class="mini-label">连续学习</p>
          <h3>连续 6 天</h3>
          <p class="card-copy">路径风格下会更突出连续性和节点推进。</p>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 68%"></div>
          </div>
        </article>
        <article class="progress-card">
          <p class="mini-label">本地收藏</p>
          <h3>28 项内容</h3>
          <p class="card-copy">全部先保存在本地，后续再进入云同步。</p>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 52%"></div>
          </div>
        </article>
      </section>

      <section class="record-list">
        ${records
          .map(
            (record) => `
              <button class="record-card ${state.activeRecord === record.id ? "is-active" : ""}" data-record="${record.id}">
                <div class="list-row">
                  <div>
                    <p class="mini-label">学习记录</p>
                    <h3>${escapeHtml(record.title)}</h3>
                    <p class="card-copy">${escapeHtml(record.meta)}</p>
                  </div>
                  <div class="record-score">${escapeHtml(record.score)}</div>
                </div>
              </button>
            `
          )
          .join("")}
      </section>
    </div>
  `;
}

function renderMinePage() {
  let syncClass = "";
  let syncCopy = "当前仅保存在本地，适合早期冷启动。";

  if (state.syncState === "pending") {
    syncClass = "is-pending";
    syncCopy = "已模拟发起同步，后续可接云开发数据库。";
  }

  if (state.syncState === "synced") {
    syncClass = "is-success";
    syncCopy = "同步状态成功，本地与云端已完成一次合并。";
  }

  return `
    <div class="page">
      <section class="hero-card">
        <p class="note-eyebrow">我的</p>
        <h2 class="hero-title">同步中心放在“我的”里</h2>
        <p class="hero-subtitle">当前阶段先本地优先，后续有用户量后，再做显式同步入口和重试机制。</p>
      </section>

      <section class="sync-card">
        <div class="section-head">
          <div>
            <p class="section-label">数据同步中心</p>
            <h3 class="section-title">本地数据状态</h3>
          </div>
          <span class="section-link">端到云</span>
        </div>
        <div class="stat-grid">
          <div class="mini-panel">
            <p class="mini-label">待同步</p>
            <div class="mini-value">14</div>
          </div>
          <div class="mini-panel">
            <p class="mini-label">上次同步</p>
            <div class="mini-value">--</div>
          </div>
        </div>
        <div class="sync-state ${syncClass}">${escapeHtml(syncCopy)}</div>
        <button class="action-button" id="sync-button">模拟同步到云开发</button>
      </section>

      <section class="surface-card">
        <div class="section-head">
          <div>
            <p class="section-label">我的页结构</p>
            <h3 class="section-title">后续常驻入口</h3>
          </div>
          <span class="section-link">设置 + 反馈</span>
        </div>
        <div class="record-list">
          <div class="list-card">
            <div class="list-row">
              <div>
                <h3>本地数据管理</h3>
                <p class="card-copy">查看收藏、记录、进度和缓存占用。</p>
              </div>
              <span class="tiny-pill">本地</span>
            </div>
          </div>
          <div class="list-card">
            <div class="list-row">
              <div>
                <h3>反馈与帮助</h3>
                <p class="card-copy">后续可以承接用户建议、问题与常见说明。</p>
              </div>
              <span class="tiny-pill">支持</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderPage() {
  switch (state.page) {
    case "content":
      return renderContentPage();
    case "study":
      return renderStudyPage();
    case "mine":
      return renderMinePage();
    case "home":
    default:
      return renderHomePage();
  }
}

function render() {
  document.body.dataset.theme = state.theme;
  renderThemeDescription();
  renderThemeSwitches();
  renderPageSwitches();
  renderTabs();
  document.getElementById("screen-content").innerHTML = renderPage();
}

function stepSyncState() {
  if (state.syncState === "local-only") {
    state.syncState = "pending";
  } else if (state.syncState === "pending") {
    state.syncState = "synced";
  } else {
    state.syncState = "local-only";
  }
}

document.addEventListener("click", (event) => {
  const themeSwitch = event.target.closest("#theme-switches [data-theme]");
  if (themeSwitch) {
    state.theme = themeSwitch.dataset.theme;
    render();
    return;
  }

  const pageSwitch = event.target.closest("[data-page]");
  if (pageSwitch) {
    state.page = pageSwitch.dataset.page;
    render();
    return;
  }

  const tab = event.target.closest("[data-tab]");
  if (tab) {
    state.page = tab.dataset.tab;
    render();
    return;
  }

  const stage = event.target.closest("[data-stage]");
  if (stage) {
    state.stage = stage.dataset.stage;
    render();
    return;
  }

  const subject = event.target.closest("[data-subject]");
  if (subject) {
    state.subject = subject.dataset.subject;
    render();
    return;
  }

  const filter = event.target.closest("[data-filter]");
  if (filter) {
    state.filter = filter.dataset.filter;
    render();
    return;
  }

  const record = event.target.closest("[data-record]");
  if (record) {
    state.activeRecord = record.dataset.record;
    render();
    return;
  }

  const pageJump = event.target.closest("[data-page-jump]");
  if (pageJump) {
    state.page = pageJump.dataset.pageJump;
    render();
    return;
  }

  if (event.target.id === "sync-button") {
    stepSyncState();
    render();
  }
});

render();
