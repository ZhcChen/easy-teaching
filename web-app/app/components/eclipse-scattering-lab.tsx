import { useMemo, useState, type RefObject } from "react";

import type { TeachingTopic } from "../data/teaching-catalog";
import { useLocale } from "../i18n";
import { BasicForceRecordTable, type BasicForceRecordGroup } from "./basic-force-record-table";
import { ControlButton } from "./control-button";
import { ControlPanelSection } from "./control-panel-section";
import { ControlRange } from "./control-range";
import { ControlStepGroup } from "./control-step-group";
import { StatusPill } from "./status-pill";
import { TeachingLabShell } from "./teaching-lab-shell";

type EclipseScatteringLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type SceneKey = "solar-eclipse" | "lunar-eclipse" | "scattering";

type ScenePreset = {
  key: SceneKey;
  stepLabel: string;
  label: string;
  summary: string;
  offset: number;
  dust: number;
};

type SceneRecord = {
  headline: string;
  note: string;
};

const PANEL_STORAGE_KEY = "easy-teaching.eclipse-scattering.panel-collapsed";

const PRESETS: Record<SceneKey, ScenePreset> = {
  "solar-eclipse": {
    key: "solar-eclipse",
    stepLabel: "1",
    label: "日食",
    summary: "月球位于太阳和地球之间时，会在地球上形成全食带和偏食区。",
    offset: 0,
    dust: 30,
  },
  "lunar-eclipse": {
    key: "lunar-eclipse",
    stepLabel: "2",
    label: "月食",
    summary: "地球位于太阳和月球之间时，月球进入地球阴影区，出现月食。",
    offset: 0,
    dust: 30,
  },
  scattering: {
    key: "scattering",
    stepLabel: "3",
    label: "光路可见",
    summary: "空气中有烟雾或灰尘时，光被散射，才能看到激光束的路径。",
    offset: 0,
    dust: 55,
  },
};

export function EclipseScatteringLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: EclipseScatteringLabProps) {
  const { isZh, tt } = useLocale();
  const [scene, setScene] = useState<SceneKey>("solar-eclipse");
  const [offset, setOffset] = useState(PRESETS["solar-eclipse"].offset);
  const [dust, setDust] = useState(PRESETS["solar-eclipse"].dust);
  const [records, setRecords] = useState<Partial<Record<SceneKey, SceneRecord>>>({});

  const metrics = useMemo(() => buildSceneMetrics({ scene, offset, dust, isZh }), [dust, isZh, offset, scene]);

  const stepItems = Object.values(PRESETS).map((preset) => ({
    key: preset.key,
    stepLabel: preset.stepLabel,
    label: tt(preset.label),
    active: scene === preset.key,
    title: tt(preset.summary),
    onClick: () => applyPreset(preset.key),
  }));

  const recordGroups: BasicForceRecordGroup[] = [
    {
      key: "space-worksheet",
      title: isZh ? "直线传播专题记录" : "Rectilinear Propagation Worksheet",
      countLabel: `${Object.keys(records).length} / 3`,
      isActive: true,
      helper: isZh ? "按“日食 → 月食 → 光路可见”顺序记录，课堂更容易串联。" : "Record solar eclipse, lunar eclipse, and visible beam in order for a smoother classroom narrative.",
      conclusion:
        Object.keys(records).length < 3
          ? (isZh ? "补齐三组记录后，可以从“被遮挡”和“被散射”两个角度统一解释光的直线传播。" : "Complete all three scenes to connect straight-line propagation with blocking and scattering.")
          : (isZh ? "归纳：日食和月食都来自天体遮挡形成的影子，光路本身通常不可见，只有进入含尘介质后散射到眼睛才会显现。" : "Summary: both solar and lunar eclipses are shadow effects caused by alignment, and a beam becomes visible only when particles scatter light into our eyes."),
      rows: Object.values(PRESETS).map((preset) => {
        const record = records[preset.key];
        return record
          ? {
              key: preset.key,
              label: tt(preset.label),
              value: record.headline,
              note: record.note,
            }
          : {
              key: preset.key,
              label: tt(preset.label),
              value: isZh ? "待测" : "Pending",
              note: isZh ? "先观察场景，再记录结论。" : "Observe the scene first, then record the conclusion.",
              isPending: true,
            };
      }),
    },
  ];

  function applyPreset(nextScene: SceneKey) {
    const preset = PRESETS[nextScene];
    setScene(nextScene);
    setOffset(preset.offset);
    setDust(preset.dust);
  }

  function resetLab() {
    setRecords({});
    applyPreset("solar-eclipse");
  }

  function recordCurrentScene() {
    setRecords((previous) => ({
      ...previous,
      [scene]: {
        headline: metrics.headline,
        note: metrics.note,
      },
    }));
  }

  return (
    <TeachingLabShell
      panelStorageKey={PANEL_STORAGE_KEY}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      fullscreenRef={fullscreenRef}
      controlTitle={isZh ? "参数控制" : "Control Panel"}
      controlCopy={isZh ? "围绕“遮挡形成影子”和“介质散射显光路”两个角度理解光的直线传播。" : "Use eclipses and scattering to understand straight-line light propagation from two angles: blocking and visible beams."}
      statusItems={[
        <StatusPill key="topic" tone="active">{isZh ? "光的直线传播" : "Straight-line Propagation"}</StatusPill>,
        <StatusPill key="scene" tone="balanced">{tt(PRESETS[scene].label)}</StatusPill>,
      ]}
      rootClassName="eclipse-scattering-shell"
      panelClassName="eclipse-control-panel"
      mainClassName="eclipse-lab-main"
      controlContent={
        <>
          <ControlPanelSection
            title={isZh ? "课堂步骤" : "Class Steps"}
            hint={isZh ? "三种场景分别对应三类现象" : "Each scene covers a different phenomenon"}
            accent
          >
            <ControlStepGroup items={stepItems} className="control-step-group is-panel" />
            <p className="force-inline-copy">{tt(PRESETS[scene].summary)}</p>
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "核心参数" : "Core Parameters"}
            hint={isZh ? "遮挡对齐决定食相，烟雾浓度决定光路可见度" : "Alignment shapes eclipses, dust controls beam visibility"}
          >
            <ControlRange
              id="eclipse-offset"
              label={scene === "scattering" ? (isZh ? "光束偏角" : "Beam angle") : (isZh ? "遮挡偏移量" : "Alignment offset")}
              min={-8}
              max={8}
              step={1}
              unit={scene === "scattering" ? "°" : "cm"}
              editable
              value={offset}
              onChange={setOffset}
            />
            <ControlRange
              id="eclipse-dust"
              label={isZh ? "烟雾 / 尘埃浓度" : "Dust density"}
              min={0}
              max={100}
              step={5}
              unit="%"
              editable
              value={dust}
              onChange={setDust}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "操作与记录" : "Observe & Record"}
            hint={isZh ? "切换场景后记录核心结论" : "Switch scenes and record the key takeaway"}
          >
            <div className="force-action-grid">
              <ControlButton variant="primary" onClick={recordCurrentScene}>
                {isZh ? "记录本组" : "Record Scene"}
              </ControlButton>
              <ControlButton variant="ghost" onClick={() => applyPreset(scene)}>
                {isZh ? "恢复预设" : "Restore Preset"}
              </ControlButton>
              <ControlButton variant="ghost" onClick={resetLab}>
                {tt("重置")}
              </ControlButton>
            </div>

            <p className="force-inline-copy">{metrics.note}</p>

            <BasicForceRecordTable
              groups={recordGroups}
              emptyTitle={isZh ? "先完成第一组场景观察" : "Finish the first scene"}
              emptyCopy={isZh ? "建议按“日食 → 月食 → 光路可见”的顺序推进，最后再统一归纳直线传播。" : "Walk through solar eclipse, lunar eclipse, and visible beams in order, then wrap up the straight-line propagation rule."}
              pendingCopy={isZh ? "待测" : "Pending"}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "思考提示" : "Think Prompt"}
            hint={isZh ? "从课堂常见问法切入" : "Use common classroom questions"}
          >
            <ul className="force-support-question-list">
              <li>{isZh ? "日食和月食为什么都要求三体几乎共线？" : "Why do both solar and lunar eclipses require near-perfect alignment?"}</li>
              <li>{isZh ? "为什么平时看不见手电筒光路，喷上烟雾后就能看到？" : "Why is a flashlight beam invisible in clean air but visible after adding smoke?"}</li>
              <li>{isZh ? "全食带和偏食区的区别，本质上是本影和半影的区别吗？" : "Is the difference between totality and partial eclipse really the same as the difference between umbra and penumbra?"}</li>
            </ul>
          </ControlPanelSection>
        </>
      }
      stageContent={
        <div className="visual-canvas force-stage-canvas eclipse-stage-canvas is-2d-mode">
          <ControlStepGroup
            className="force-stage-overlay is-top-center force-stage-stepbar"
            items={stepItems}
          />
          <div className="visual-glow visual-glow-a" />
          <div className="visual-glow visual-glow-b" />

          <div className="force-stage-overlay is-top-left">
            <div className="force-stage-hud-card">
              <div className="force-stage-hud-head">
                <span className="force-stage-hud-title">{isZh ? "当前验证重点" : "Current focus"}</span>
                <StatusPill tone={metrics.statusTone}>{metrics.statusLabel}</StatusPill>
              </div>
              <p className="pressure-stage-copy">{tt(PRESETS[scene].summary)}</p>
              <div className="force-stage-chip-grid">
                <span className="force-stage-chip">{metrics.headline}</span>
                <span className="force-stage-chip">{scene === "scattering" ? (isZh ? "散射让光路可见" : "Scattering reveals the beam") : (isZh ? "遮挡形成影子" : "Blocking forms shadows")}</span>
              </div>
            </div>
          </div>

          <div className="force-stage-overlay is-bottom-left">
            <div className="force-stage-hud-card is-tight">
              <div className="force-stage-hud-head">
                <span className="force-stage-hud-title">{isZh ? "实时读数" : "Live Reading"}</span>
              </div>
              <div className="pressure-stage-metric-grid">
                <article className="force-stage-result-pill">
                  <strong>{metrics.coverage}</strong>
                  <span>{metrics.coverageLabel}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{metrics.shadowLabel}</strong>
                  <span>{isZh ? "阴影类型" : "Shadow type"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{`${dust}%`}</strong>
                  <span>{isZh ? "烟雾浓度" : "Dust density"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{scene === "scattering" ? `${offset > 0 ? "+" : ""}${offset}°` : `${offset > 0 ? "+" : ""}${offset} cm`}</strong>
                  <span>{scene === "scattering" ? (isZh ? "光束偏角" : "Beam angle") : (isZh ? "偏移量" : "Offset")}</span>
                </article>
              </div>
              <p className="pressure-stage-formula">{metrics.note}</p>
            </div>
          </div>

          <div className="force-stage-overlay is-bottom-right">
            <div className="force-stage-hud-card is-tight shadow-stage-summary-card">
              <div className="force-stage-hud-head">
                <span className="force-stage-hud-title">{isZh ? "课堂摘要" : "Classroom Summary"}</span>
                <span className="force-stage-chip">{`${Object.keys(records).length} / 3`}</span>
              </div>
              <div className="shadow-stage-summary-grid">
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "当前场景" : "Current scene"}</span>
                  <strong>{tt(PRESETS[scene].label)}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "关键现象" : "Key effect"}</span>
                  <strong>{metrics.headline}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "已记录" : "Recorded"}</span>
                  <strong>{`${Object.keys(records).length} / 3`}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "知识主线" : "Main thread"}</span>
                  <strong>{isZh ? "直线传播" : "Straight path"}</strong>
                </article>
              </div>
            </div>
          </div>

          <svg
            viewBox="0 0 1160 760"
            className="force-stage-svg eclipse-stage-svg"
            role="img"
            aria-label={isZh ? `${topic.title}可视化示意图` : `${topic.title} visualization`}
          >
            <defs>
              <radialGradient id="eclipse-sun-glow">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#f59e0b" />
              </radialGradient>
              <radialGradient id="eclipse-moon-body">
                <stop offset="0%" stopColor="#d4d8e4" />
                <stop offset="100%" stopColor="#8390aa" />
              </radialGradient>
              <radialGradient id="eclipse-earth-body">
                <stop offset="0%" stopColor="#5bd1b0" />
                <stop offset="55%" stopColor="#3785ff" />
                <stop offset="100%" stopColor="#173d7a" />
              </radialGradient>
            </defs>

            <rect x="74" y="88" width="1012" height="560" rx="36" className="motion-stage-panel-shell" />
            <text x="110" y="126" className="motion-stage-panel-title">{isZh ? "直线传播现象实验台" : "Propagation Phenomena Bench"}</text>
            <text x="110" y="152" className="motion-stage-panel-copy">
              {scene === "scattering"
                ? (isZh ? "对比“无尘空气中几乎看不见光路”和“有烟雾时光路显现”的差异。" : "Compare how a beam stays almost invisible in clean air but becomes visible when particles scatter it.")
                : (isZh ? "通过三体遮挡关系观察本影、半影和食相变化。" : "Use celestial alignment to observe umbra, penumbra, and eclipse phases.")}
            </text>

            {scene === "scattering" ? (
              <ScatteringStage offset={offset} dust={dust} isZh={isZh} />
            ) : (
              <EclipseStage scene={scene} offset={offset} coverage={metrics.coveragePercent} isZh={isZh} />
            )}
          </svg>
        </div>
      }
    />
  );
}

function EclipseStage({
  scene,
  offset,
  coverage,
  isZh,
}: {
  scene: Exclude<SceneKey, "scattering">;
  offset: number;
  coverage: number;
  isZh: boolean;
}) {
  const middleBody = scene === "solar-eclipse"
    ? { x: 560, y: 354, r: 54, fill: "url(#eclipse-moon-body)", label: isZh ? "月球" : "Moon" }
    : { x: 560, y: 354, r: 76, fill: "url(#eclipse-earth-body)", label: isZh ? "地球" : "Earth" };
  const rightBody = scene === "solar-eclipse"
    ? { x: 874, y: 354 + offset * 2.2, r: 82, fill: "url(#eclipse-earth-body)", label: isZh ? "地球" : "Earth" }
    : { x: 874, y: 354 + offset * 2.2, r: 54, fill: "url(#eclipse-moon-body)", label: isZh ? "月球" : "Moon" };
  const shadowOpacity = 0.16 + coverage * 0.44;

  return (
    <>
      <circle cx="250" cy="354" r="112" fill="url(#eclipse-sun-glow)" className="eclipse-stage-sun" />
      <text x="250" y="512" textAnchor="middle" className="motion-stage-ruler-label">{isZh ? "太阳" : "Sun"}</text>

      <path
        d={`M 320 300 L ${middleBody.x - 24} ${middleBody.y - middleBody.r + offset * 1.2} L ${rightBody.x - rightBody.r - 18} ${rightBody.y - 54}
            L ${rightBody.x - rightBody.r - 18} ${rightBody.y + 54} L ${middleBody.x - 24} ${middleBody.y + middleBody.r + offset * 1.2} Z`}
        className="eclipse-stage-shadow"
        style={{ opacity: shadowOpacity }}
      />
      <path
        d={`M 320 326 L ${middleBody.x - 16} ${middleBody.y - middleBody.r * 0.55} L ${rightBody.x - rightBody.r - 18} ${rightBody.y - 24}
            L ${rightBody.x - rightBody.r - 18} ${rightBody.y + 24} L ${middleBody.x - 16} ${middleBody.y + middleBody.r * 0.55} Z`}
        className="eclipse-stage-umbra"
        style={{ opacity: shadowOpacity + 0.14 }}
      />

      <circle cx={middleBody.x} cy={middleBody.y + offset * 0.9} r={middleBody.r} fill={middleBody.fill} className="eclipse-stage-body" />
      <circle cx={rightBody.x} cy={rightBody.y} r={rightBody.r} fill={rightBody.fill} className="eclipse-stage-body" />

      <text x={middleBody.x} y="512" textAnchor="middle" className="motion-stage-ruler-label">{middleBody.label}</text>
      <text x={rightBody.x} y="512" textAnchor="middle" className="motion-stage-ruler-label">{rightBody.label}</text>

      <text x="736" y="216" textAnchor="middle" className="force-svg-title">
        {scene === "solar-eclipse" ? (isZh ? "月球挡住太阳光，地球上出现日食" : "The Moon blocks sunlight and creates a solar eclipse on Earth") : (isZh ? "地球挡住太阳光，月球进入地影形成月食" : "Earth blocks sunlight and its shadow falls on the Moon")}
      </text>
      <text x="736" y="246" textAnchor="middle" className="force-svg-copy">
        {isZh ? "中央深色区可类比全食带 / 全食区，两侧浅色区可类比偏食区。" : "The dark center acts like totality, while the lighter edges act like partial-eclipse regions."}
      </text>
    </>
  );
}

function ScatteringStage({
  offset,
  dust,
  isZh,
}: {
  offset: number;
  dust: number;
  isZh: boolean;
}) {
  const beamStartX = 222;
  const beamStartY = 360;
  const beamEndX = 938;
  const beamEndY = 360 - offset * 7.5;
  const particleCount = Math.max(6, Math.round(dust / 6));

  return (
    <>
      <rect x="148" y="312" width="96" height="96" rx="24" className="eclipse-stage-projector" />
      <circle cx="242" cy="360" r="18" className="eclipse-stage-projector-lens" />
      <text x="196" y="446" textAnchor="middle" className="motion-stage-ruler-label">{isZh ? "激光源" : "Laser"}</text>

      <path
        d={`M ${beamStartX} ${beamStartY - 16} L ${beamStartX} ${beamStartY + 16} L ${beamEndX} ${beamEndY + 56} L ${beamEndX} ${beamEndY - 56} Z`}
        className="eclipse-stage-beam-volume"
        style={{ opacity: 0.08 + dust / 220 }}
      />
      <line x1={beamStartX} y1={beamStartY} x2={beamEndX} y2={beamEndY} className="eclipse-stage-beam-core" />

      {Array.from({ length: particleCount }).map((_, index) => {
        const t = (index + 1) / (particleCount + 1);
        const px = beamStartX + (beamEndX - beamStartX) * t;
        const py = beamStartY + (beamEndY - beamStartY) * t + Math.sin(index * 1.8) * 24;
        const size = 3 + (index % 3);
        return (
          <circle
            key={`${px}-${py}`}
            cx={px}
            cy={py}
            r={size}
            className="eclipse-stage-particle"
            style={{ opacity: 0.18 + dust / 150 }}
          />
        );
      })}

      <rect x="922" y="254" width="72" height="212" rx="24" className="eclipse-stage-screen" />
      <text x="958" y="506" textAnchor="middle" className="motion-stage-ruler-label">{isZh ? "观察屏" : "Screen"}</text>

      <text x="602" y="214" textAnchor="middle" className="force-svg-title">
        {isZh ? "空气干净时只能看到亮点，烟雾增多后才能看到整条光束" : "Clean air shows only the bright spot; extra smoke reveals the whole beam"}
      </text>
      <text x="602" y="242" textAnchor="middle" className="force-svg-copy">
        {isZh ? "这是因为微粒把原本沿直线前进的光散射到你的眼睛里。" : "Particles scatter the straight-traveling light into your eyes."}
      </text>
    </>
  );
}

function buildSceneMetrics({
  scene,
  offset,
  dust,
  isZh,
}: {
  scene: SceneKey;
  offset: number;
  dust: number;
  isZh: boolean;
}) {
  if (scene === "scattering") {
    const visibility = clamp(Math.round(dust - Math.abs(offset) * 3 + 24), 12, 100);
    const headline = visibility >= 70 ? (isZh ? "整条光束清晰可见" : "Whole beam visible") : visibility >= 40 ? (isZh ? "能看见明显光路" : "Beam becomes visible") : (isZh ? "只看见端点亮斑" : "Only the bright end point is visible");
    return {
      coverage: `${visibility}%`,
      coveragePercent: visibility / 100,
      coverageLabel: isZh ? "可见度" : "Visibility",
      shadowLabel: isZh ? "散射显光路" : "Scattering",
      headline,
      note:
        visibility >= 70
          ? (isZh ? "烟雾较浓，粒子把光散射到眼睛里，所以整条光束都显现出来。" : "Dense smoke scatters light into the eye, so the entire beam becomes visible.")
          : (isZh ? "空气较干净时，光仍沿直线传播，但你几乎看不见路径本身。" : "In cleaner air, light still travels straight, but the path itself stays almost invisible."),
      statusLabel: visibility >= 70 ? (isZh ? "光路清晰" : "Beam visible") : (isZh ? "直线传播" : "Straight path"),
      statusTone: visibility >= 70 ? "balanced" as const : "active" as const,
    };
  }

  const coveragePercent = clamp((100 - Math.abs(offset) * 9) / 100, 0.18, 1);
  const coverage = `${Math.round(coveragePercent * 100)}%`;
  const total = coveragePercent >= 0.88;
  const partial = coveragePercent >= 0.45;
  const headline = scene === "solar-eclipse"
    ? total
      ? (isZh ? "全食带经过地球表面" : "Totality crosses Earth")
      : partial
        ? (isZh ? "地球上出现偏食区" : "Partial eclipse region")
        : (isZh ? "几乎错开，只剩很弱食相" : "Barely aligned, only a weak eclipse")
    : total
      ? (isZh ? "月球进入地球本影区" : "Moon enters Earth's umbra")
      : partial
        ? (isZh ? "月球掠过地球半影 / 本影边缘" : "Moon grazes the penumbra / umbra edge")
        : (isZh ? "月球偏离地影，只出现很弱变化" : "Moon misses most of the shadow");
  return {
    coverage,
    coveragePercent,
    coverageLabel: isZh ? "遮挡覆盖度" : "Coverage",
    shadowLabel: total ? (isZh ? "本影主导" : "Umbra") : (isZh ? "半影主导" : "Penumbra"),
    headline,
    note: scene === "solar-eclipse"
      ? (isZh ? "月球挡住太阳光后，地球上落入本影就是全食，落入半影就是偏食。" : "When the Moon blocks sunlight, umbra causes total eclipse while penumbra causes partial eclipse on Earth.")
      : (isZh ? "地球挡住太阳光后，月球进入本影会更暗，擦到半影时只出现轻微变暗。" : "When Earth blocks sunlight, the Moon darkens strongly in the umbra and only slightly in the penumbra."),
    statusLabel: total ? (isZh ? "对齐充分" : "Strong alignment") : (isZh ? "部分对齐" : "Partial alignment"),
    statusTone: total ? "balanced" as const : "warning" as const,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
