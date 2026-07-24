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

type MeltingFreezingLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type ThermalSceneKey = "crystal-melting" | "amorphous-melting" | "crystal-freezing" | "amorphous-freezing";

type ThermalPreset = {
  key: ThermalSceneKey;
  stepLabel: string;
  label: string;
  summary: string;
};

type ThermalRecord = {
  value: string;
  note: string;
};

type ThermalDatasetPoint = {
  time: number;
  temp: number;
  state: string;
};

const PANEL_STORAGE_KEY = "easy-teaching.melting-freezing.panel-collapsed";

const PRESETS: Record<ThermalSceneKey, ThermalPreset> = {
  "crystal-melting": {
    key: "crystal-melting",
    stepLabel: "1",
    label: "晶体熔化",
    summary: "晶体熔化时会出现温度保持不变的平台，说明它一边吸热一边完成物态变化。",
  },
  "amorphous-melting": {
    key: "amorphous-melting",
    stepLabel: "2",
    label: "非晶体熔化",
    summary: "非晶体受热时会逐渐软化，没有固定熔点，温度会持续升高。",
  },
  "crystal-freezing": {
    key: "crystal-freezing",
    stepLabel: "3",
    label: "晶体凝固",
    summary: "晶体凝固时也会出现温度平台，说明放热但温度保持不变。",
  },
  "amorphous-freezing": {
    key: "amorphous-freezing",
    stepLabel: "4",
    label: "非晶体凝固",
    summary: "非晶体凝固过程中温度持续降低，没有固定凝固点。",
  },
};

const DATASETS: Record<ThermalSceneKey, ThermalDatasetPoint[]> = {
  "crystal-melting": [
    { time: 0, temp: 40, state: "固态" },
    { time: 1, temp: 42, state: "固态" },
    { time: 2, temp: 44, state: "固态" },
    { time: 3, temp: 46, state: "固态" },
    { time: 4, temp: 48, state: "开始熔化" },
    { time: 5, temp: 48, state: "固液共存" },
    { time: 6, temp: 48, state: "固液共存" },
    { time: 7, temp: 48, state: "刚熔化完" },
    { time: 8, temp: 50, state: "液态" },
    { time: 9, temp: 52, state: "液态" },
    { time: 10, temp: 54, state: "液态" },
  ],
  "amorphous-melting": [
    { time: 0, temp: 40, state: "硬固态" },
    { time: 1, temp: 42, state: "稍软" },
    { time: 2, temp: 44, state: "较软" },
    { time: 3, temp: 47, state: "软" },
    { time: 4, temp: 50, state: "黏稠" },
    { time: 5, temp: 53, state: "稀软" },
    { time: 6, temp: 56, state: "流动" },
    { time: 7, temp: 59, state: "较稀" },
    { time: 8, temp: 62, state: "流动" },
    { time: 9, temp: 65, state: "流动" },
    { time: 10, temp: 68, state: "流动" },
  ],
  "crystal-freezing": [
    { time: 0, temp: 54, state: "液态" },
    { time: 1, temp: 52, state: "液态" },
    { time: 2, temp: 50, state: "液态" },
    { time: 3, temp: 48, state: "开始凝固" },
    { time: 4, temp: 48, state: "液固共存" },
    { time: 5, temp: 48, state: "液固共存" },
    { time: 6, temp: 48, state: "液固共存" },
    { time: 7, temp: 48, state: "刚凝固完" },
    { time: 8, temp: 46, state: "固态" },
    { time: 9, temp: 44, state: "固态" },
    { time: 10, temp: 42, state: "固态" },
  ],
  "amorphous-freezing": [
    { time: 0, temp: 68, state: "流动" },
    { time: 1, temp: 65, state: "流动" },
    { time: 2, temp: 62, state: "较稠" },
    { time: 3, temp: 59, state: "黏稠" },
    { time: 4, temp: 56, state: "较软" },
    { time: 5, temp: 53, state: "软化结束" },
    { time: 6, temp: 50, state: "偏硬" },
    { time: 7, temp: 47, state: "变硬" },
    { time: 8, temp: 44, state: "硬固态" },
    { time: 9, temp: 42, state: "硬固态" },
    { time: 10, temp: 40, state: "硬固态" },
  ],
};

export function MeltingFreezingLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: MeltingFreezingLabProps) {
  const { isZh, tt } = useLocale();
  const [scene, setScene] = useState<ThermalSceneKey>("crystal-melting");
  const [timeIndex, setTimeIndex] = useState(0);
  const [records, setRecords] = useState<Partial<Record<ThermalSceneKey, ThermalRecord>>>({});

  const metrics = useMemo(
    () => buildThermalMetrics({ scene, timeIndex, isZh }),
    [isZh, scene, timeIndex],
  );

  const stepItems = Object.values(PRESETS).map((preset) => ({
    key: preset.key,
    stepLabel: preset.stepLabel,
    label: tt(preset.label),
    active: scene === preset.key,
    title: tt(preset.summary),
    onClick: () => setSceneAndResetTime(preset.key),
  }));

  const recordGroups: BasicForceRecordGroup[] = [
    {
      key: "thermal-worksheet",
      title: isZh ? "熔化凝固记录单" : "Thermal Worksheet",
      countLabel: `${Object.keys(records).length} / 4`,
      isActive: true,
      helper: isZh ? "建议按“晶体熔化 → 非晶体熔化 → 晶体凝固 → 非晶体凝固”的顺序记录。" : "Record crystal melting, amorphous melting, crystal freezing, and amorphous freezing in order.",
      conclusion:
        Object.keys(records).length < 4
          ? (isZh ? "补齐四组记录后，就能完整对比“有无平台”“有无固定熔点 / 凝固点”。" : "Complete all four scenes to compare whether a plateau exists and whether there is a fixed melting/freezing point.")
          : (isZh ? "归纳：晶体在熔化和凝固时都有温度平台，非晶体没有；晶体有固定熔点和凝固点，非晶体只有逐渐软化和逐渐变硬。" : "Summary: crystals show temperature plateaus during melting and freezing, while amorphous substances do not. Crystals have fixed melting/freezing points; amorphous substances only soften and harden gradually."),
      rows: Object.values(PRESETS).map((preset) => {
        const record = records[preset.key];
        return record
          ? {
              key: preset.key,
              label: tt(preset.label),
              value: record.value,
              note: record.note,
            }
          : {
              key: preset.key,
              label: tt(preset.label),
              value: isZh ? "待测" : "Pending",
              note: isZh ? "先观察曲线和状态变化，再记录结论。" : "Observe the curve and material state before recording the conclusion.",
              isPending: true,
            };
      }),
    },
  ];

  function setSceneAndResetTime(nextScene: ThermalSceneKey) {
    setScene(nextScene);
    setTimeIndex(0);
  }

  function recordCurrentScene() {
    setRecords((previous) => ({
      ...previous,
      [scene]: {
        value: metrics.recordValue,
        note: metrics.summary,
      },
    }));
  }

  function resetLab() {
    setRecords({});
    setSceneAndResetTime("crystal-melting");
  }

  return (
    <TeachingLabShell
      panelStorageKey={PANEL_STORAGE_KEY}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      fullscreenRef={fullscreenRef}
      controlTitle={isZh ? "参数控制" : "Control Panel"}
      controlCopy={isZh ? "用“材料状态 + 温度曲线”同时观察晶体和非晶体的熔化、凝固差异。" : "Observe crystal and amorphous melting/freezing through both material state and temperature curves."}
      statusItems={[
        <StatusPill key="topic" tone="active">{isZh ? "熔化与凝固" : "Melting & Freezing"}</StatusPill>,
        <StatusPill key="status" tone={metrics.statusTone}>{metrics.statusLabel}</StatusPill>,
      ]}
      rootClassName="thermal-lab-shell"
      panelClassName="thermal-control-panel"
      mainClassName="thermal-lab-main"
      controlContent={
        <>
          <ControlPanelSection
            title={isZh ? "课堂步骤" : "Class Steps"}
            hint={isZh ? "四种典型过程足够讲清热学区别" : "Four typical processes cover the core difference"}
            accent
          >
            <ControlStepGroup items={stepItems} className="control-step-group is-panel" />
            <p className="force-inline-copy">{tt(PRESETS[scene].summary)}</p>
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "过程推进" : "Process Timeline"}
            hint={isZh ? "拖动时间节点，查看不同阶段的状态和温度" : "Scrub through time to inspect states and temperatures"}
          >
            <ControlRange
              id="thermal-time-index"
              label={isZh ? "时间节点" : "Time index"}
              min={0}
              max={10}
              step={1}
              unit={isZh ? "min" : "min"}
              editable
              value={timeIndex}
              onChange={setTimeIndex}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "操作与记录" : "Observe & Record"}
            hint={isZh ? "先看平台和状态，再记录本组" : "Observe the plateau and state before recording"}
          >
            <div className="force-action-grid">
              <ControlButton variant="primary" onClick={recordCurrentScene}>
                {isZh ? "记录本组" : "Record This Run"}
              </ControlButton>
              <ControlButton variant="ghost" onClick={() => setTimeIndex(0)}>
                {isZh ? "回到起点" : "Back to Start"}
              </ControlButton>
              <ControlButton variant="ghost" onClick={resetLab}>
                {tt("重置")}
              </ControlButton>
            </div>

            <p className="force-inline-copy">{metrics.summary}</p>

            <BasicForceRecordTable
              groups={recordGroups}
              emptyTitle={isZh ? "先完成第一组观察" : "Finish the first observation"}
              emptyCopy={isZh ? "建议先看晶体熔化平台，再和非晶体作对照，最后补凝固过程。" : "Start with the crystal melting plateau, compare it with the amorphous case, then add freezing."}
              pendingCopy={isZh ? "待测" : "Pending"}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "思考提示" : "Think Prompt"}
            hint={isZh ? "把图像、状态和应用联系起来" : "Link graphs, states, and applications"}
          >
            <ul className="force-support-question-list">
              <li>{isZh ? "为什么海波熔化时吸热，但温度却不再上升？" : "Why does para-dichlorobenzene keep absorbing heat while its temperature stays flat?"}</li>
              <li>{isZh ? "为什么石蜡没有固定熔点，却仍然会慢慢变软和流动？" : "Why does wax soften and flow without a fixed melting point?"}</li>
              <li>{isZh ? "冰袋降温和金属铸造，分别利用了哪种吸放热过程？" : "Which heat-absorption or heat-release process do ice packs and metal casting rely on?"}</li>
            </ul>
          </ControlPanelSection>
        </>
      }
      stageContent={
        <div className="visual-canvas force-stage-canvas thermal-stage-canvas is-2d-mode">
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
                <span className="force-stage-chip">{metrics.materialLabel}</span>
                <span className="force-stage-chip">{metrics.platformLabel}</span>
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
                  <strong>{`${metrics.currentPoint.time} min`}</strong>
                  <span>{isZh ? "时间" : "Time"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{`${metrics.currentPoint.temp}℃`}</strong>
                  <span>{isZh ? "温度" : "Temperature"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{metrics.currentPoint.state}</strong>
                  <span>{isZh ? "状态" : "State"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{metrics.phaseLabel}</strong>
                  <span>{isZh ? "过程特点" : "Phase"}</span>
                </article>
              </div>
              <p className="pressure-stage-formula">{metrics.formulaCopy}</p>
            </div>
          </div>

          <div className="force-stage-overlay is-bottom-right">
            <div className="force-stage-hud-card is-tight shadow-stage-summary-card">
              <div className="force-stage-hud-head">
                <span className="force-stage-hud-title">{isZh ? "课堂摘要" : "Classroom Summary"}</span>
                <span className="force-stage-chip">{`${Object.keys(records).length} / 4`}</span>
              </div>
              <div className="shadow-stage-summary-grid">
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "当前材料" : "Current material"}</span>
                  <strong>{metrics.materialLabel}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "平台现象" : "Plateau"}</span>
                  <strong>{metrics.platformLabel}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "当前阶段" : "Current phase"}</span>
                  <strong>{metrics.phaseLabel}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "已记录" : "Recorded"}</span>
                  <strong>{`${Object.keys(records).length} / 4`}</strong>
                </article>
              </div>
            </div>
          </div>

          <svg
            viewBox="0 0 1160 760"
            className="force-stage-svg thermal-stage-svg"
            role="img"
            aria-label={isZh ? `${topic.title}可视化示意图` : `${topic.title} visualization`}
          >
            <defs>
              <linearGradient id="thermal-liquid-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(245, 158, 11, 0.18)" />
                <stop offset="100%" stopColor="rgba(245, 158, 11, 0.8)" />
              </linearGradient>
              <linearGradient id="thermal-solid-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c4b5fd" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>

            <rect x="74" y="88" width="1012" height="560" rx="36" className="motion-stage-panel-shell" />
            <text x="110" y="126" className="motion-stage-panel-title">{isZh ? "熔化凝固实验台" : "Melting / Freezing Bench"}</text>
            <text x="110" y="152" className="motion-stage-panel-copy">
              {isZh ? "左侧看试管中物质状态，右侧看温度—时间曲线；两边一起判断是否存在平台。" : "Watch the material in the tube on the left and the temperature-time curve on the right; use both to decide whether a plateau exists."}
            </text>

            <g transform="translate(0 10)">
              <rect x="156" y="264" width="204" height="256" rx="30" className="thermal-stage-bath" />
              <rect x="192" y="226" width="72" height="278" rx="28" className="thermal-stage-tube" />
              <rect x="200" y={metrics.materialFillY} width="56" height={486 - metrics.materialFillY} rx="22" fill={metrics.isLiquidLike ? "url(#thermal-liquid-fill)" : "url(#thermal-solid-fill)"} className="thermal-stage-material" />
              <rect x="278" y="238" width="18" height="182" rx="9" className="thermal-stage-thermometer" />
              <line x1="287" y1="392" x2="287" y2={392 - metrics.thermometerOffset} className="thermal-stage-thermometer-mercury" />
              <circle cx="287" cy="402" r="14" className="thermal-stage-thermometer-bulb" />
              <text x="220" y="548" textAnchor="middle" className="motion-stage-ruler-label">{metrics.currentPoint.state}</text>
              <text x="287" y="444" textAnchor="middle" className="force-svg-copy">{`${metrics.currentPoint.temp}℃`}</text>
            </g>

            <g transform="translate(0 0)">
              <rect x="424" y="228" width="556" height="308" rx="28" className="thermal-stage-chart-shell" />
              <text x="456" y="264" className="force-svg-title">{isZh ? "温度 - 时间曲线" : "Temperature vs. Time"}</text>
              <text x="456" y="288" className="force-svg-copy">{metrics.chartCaption}</text>

              <line x1="472" y1="488" x2="932" y2="488" className="pressure-stage-measure-line" />
              <line x1="472" y1="312" x2="472" y2="488" className="pressure-stage-measure-line" />
              <text x="934" y="508" className="force-svg-copy">{isZh ? "时间 / min" : "Time / min"}</text>
              <text x="444" y="300" className="force-svg-copy">{isZh ? "温度 / ℃" : "Temp / ℃"}</text>

              <polyline points={metrics.polylinePoints} className="thermal-stage-curve" />
              {metrics.platformLine ? <line x1={metrics.platformLine.x1} y1={metrics.platformLine.y1} x2={metrics.platformLine.x2} y2={metrics.platformLine.y2} className="thermal-stage-platform" /> : null}
              <circle cx={metrics.currentPointX} cy={metrics.currentPointY} r="7" className="thermal-stage-current-point" />

              {metrics.ticks.map((tick) => (
                <g key={tick.key}>
                  <line x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} className="thermal-stage-tick" />
                  <text x={tick.labelX} y={tick.labelY} textAnchor={tick.anchor} className="force-svg-copy">{tick.label}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      }
    />
  );
}

function buildThermalMetrics({
  scene,
  timeIndex,
  isZh,
}: {
  scene: ThermalSceneKey;
  timeIndex: number;
  isZh: boolean;
}) {
  const dataset = DATASETS[scene];
  const currentPoint = dataset[Math.min(dataset.length - 1, Math.max(0, Math.round(timeIndex)))];
  const isCrystal = scene === "crystal-melting" || scene === "crystal-freezing";
  const isMelting = scene === "crystal-melting" || scene === "amorphous-melting";
  const hasPlatform = isCrystal;
  const phaseLabel = hasPlatform && currentPoint.temp === 48
    ? (isZh ? "平台阶段" : "Plateau phase")
    : isMelting
      ? (isZh ? "吸热升温 / 软化" : "Heating / softening")
      : (isZh ? "放热降温 / 变硬" : "Cooling / hardening");
  const statusLabel = isMelting ? (isZh ? "熔化过程" : "Melting") : (isZh ? "凝固过程" : "Freezing");
  const statusTone = hasPlatform && currentPoint.temp === 48 ? "balanced" as const : isMelting ? "active" as const : "warning" as const;
  const materialLabel = isCrystal ? (isZh ? "晶体（海波）" : "Crystal") : (isZh ? "非晶体（石蜡）" : "Amorphous");
  const platformLabel = hasPlatform ? (isZh ? "有温度平台" : "Plateau present") : (isZh ? "无温度平台" : "No plateau");
  const summary = hasPlatform
    ? (isZh ? `当前温度 ${currentPoint.temp}℃，${currentPoint.state}。这类材料在熔化 / 凝固平台阶段会持续吸热或放热，但温度保持不变。` : `The material is at ${currentPoint.temp}℃ and ${currentPoint.state}. During the plateau, it keeps absorbing or releasing heat while the temperature stays constant.`)
    : (isZh ? `当前温度 ${currentPoint.temp}℃，${currentPoint.state}。非晶体没有固定熔点 / 凝固点，所以曲线持续变化。` : `The material is at ${currentPoint.temp}℃ and ${currentPoint.state}. Amorphous substances have no fixed melting/freezing point, so the curve keeps changing.`)
  ;
  const formulaCopy = hasPlatform
    ? (isZh ? "晶体满足：达到熔点 / 凝固点后，继续吸热或放热时温度平台仍保持不变。" : "For crystals, once the melting/freezing point is reached, continued heat transfer keeps the temperature flat at the plateau.")
    : (isZh ? "非晶体没有固定熔点，受热会逐渐软化，冷却会逐渐变硬，所以图像没有水平段。" : "Amorphous substances have no fixed melting point, so they soften or harden gradually and their graphs have no horizontal segment.")
  ;
  const recordValue = `${currentPoint.temp}℃`;
  const ticks = buildThermalTicks(dataset);
  const polylinePoints = buildPolyline(dataset);
  const currentPointX = 472 + currentPoint.time * 46;
  const currentPointY = 488 - (currentPoint.temp - 40) * 6.1;
  const platformLine = hasPlatform
    ? {
        x1: 472 + 4 * 46,
        y1: 488 - (48 - 40) * 6.1,
        x2: 472 + 7 * 46,
        y2: 488 - (48 - 40) * 6.1,
      }
    : null;
  const liquidRatio = scene === "amorphous-melting"
    ? clamp((timeIndex - 2) / 8, 0, 1)
    : scene === "crystal-melting"
      ? clamp((timeIndex - 4) / 4, 0, 1)
      : scene === "crystal-freezing"
        ? clamp(1 - (timeIndex - 3) / 5, 0, 1)
        : clamp(1 - (timeIndex - 1) / 8, 0, 1);
  const materialFillY = 470 - liquidRatio * 130;
  const thermometerOffset = clamp((currentPoint.temp - 38) * 4.2, 12, 132);
  const isLiquidLike = scene === "amorphous-melting"
    ? timeIndex >= 5
    : scene === "crystal-melting"
      ? timeIndex >= 8
      : scene === "crystal-freezing"
        ? timeIndex <= 3
        : timeIndex <= 4;

  return {
    dataset,
    currentPoint,
    statusLabel,
    statusTone,
    materialLabel,
    platformLabel,
    phaseLabel,
    summary,
    formulaCopy,
    recordValue,
    polylinePoints,
    currentPointX,
    currentPointY,
    platformLine,
    chartCaption: hasPlatform
      ? (isZh ? "注意观察 48℃ 附近的水平平台。" : "Look for the flat plateau around 48℃.")
      : (isZh ? "曲线始终变化，没有固定平台。" : "The curve keeps moving without a fixed plateau."),
    ticks,
    materialFillY,
    thermometerOffset,
    isLiquidLike,
  };
}

function buildPolyline(dataset: ThermalDatasetPoint[]) {
  return dataset
    .map((point) => `${472 + point.time * 46},${488 - (point.temp - 40) * 6.1}`)
    .join(" ");
}

function buildThermalTicks(dataset: ThermalDatasetPoint[]) {
  const ticks: Array<{
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    labelX: number;
    labelY: number;
    label: string;
    anchor: "middle" | "end";
  }> = [];

  for (const point of dataset) {
    ticks.push({
      key: `x-${point.time}`,
      x1: 472 + point.time * 46,
      y1: 488,
      x2: 472 + point.time * 46,
      y2: 496,
      labelX: 472 + point.time * 46,
      labelY: 516,
      label: String(point.time),
      anchor: "middle",
    });
  }

  for (const temp of [40, 48, 56, 64]) {
    ticks.push({
      key: `y-${temp}`,
      x1: 464,
      y1: 488 - (temp - 40) * 6.1,
      x2: 472,
      y2: 488 - (temp - 40) * 6.1,
      labelX: 456,
      labelY: 492 - (temp - 40) * 6.1,
      label: String(temp),
      anchor: "end",
    });
  }

  return ticks;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
