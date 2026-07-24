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

type PinholeImagingLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type PinholePresetKey = "object-distance" | "screen-distance" | "aperture-size";

type PinholePreset = {
  key: PinholePresetKey;
  stepLabel: string;
  label: string;
  summary: string;
  objectDistanceCm: number;
  screenDistanceCm: number;
  apertureMm: number;
};

type PinholeRecord = {
  imageHeightCm: number;
  clarity: number;
  brightness: number;
  note: string;
};

const PANEL_STORAGE_KEY = "easy-teaching.pinhole-imaging.panel-collapsed";
const OBJECT_HEIGHT_CM = 9;
const OBJECT_DISTANCE_MIN = 18;
const OBJECT_DISTANCE_MAX = 42;
const SCREEN_DISTANCE_MIN = 10;
const SCREEN_DISTANCE_MAX = 34;
const APERTURE_MIN = 1;
const APERTURE_MAX = 6;

const PRESETS: Record<PinholePresetKey, PinholePreset> = {
  "object-distance": {
    key: "object-distance",
    stepLabel: "1",
    label: "改变物距",
    summary: "物体远离小孔时，像会变小；物体靠近小孔时，像会变大。",
    objectDistanceCm: 22,
    screenDistanceCm: 16,
    apertureMm: 2,
  },
  "screen-distance": {
    key: "screen-distance",
    stepLabel: "2",
    label: "改变像距",
    summary: "光屏离小孔越远，像越大，但亮度会略有下降。",
    objectDistanceCm: 28,
    screenDistanceCm: 28,
    apertureMm: 2,
  },
  "aperture-size": {
    key: "aperture-size",
    stepLabel: "3",
    label: "改变小孔",
    summary: "小孔越小像越清晰但更暗；小孔越大像更亮但会变模糊。",
    objectDistanceCm: 28,
    screenDistanceCm: 18,
    apertureMm: 4.5,
  },
};

export function PinholeImagingLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: PinholeImagingLabProps) {
  const { isZh, tt } = useLocale();
  const [activePreset, setActivePreset] = useState<PinholePresetKey>("object-distance");
  const [objectDistanceCm, setObjectDistanceCm] = useState(PRESETS["object-distance"].objectDistanceCm);
  const [screenDistanceCm, setScreenDistanceCm] = useState(PRESETS["object-distance"].screenDistanceCm);
  const [apertureMm, setApertureMm] = useState(PRESETS["object-distance"].apertureMm);
  const [records, setRecords] = useState<Partial<Record<PinholePresetKey, PinholeRecord>>>({});

  const metrics = useMemo(
    () => buildPinholeMetrics({ objectDistanceCm, screenDistanceCm, apertureMm }),
    [apertureMm, objectDistanceCm, screenDistanceCm],
  );

  const stepItems = (Object.values(PRESETS)).map((preset) => ({
    key: preset.key,
    stepLabel: preset.stepLabel,
    label: tt(preset.label),
    active: activePreset === preset.key,
    title: tt(preset.summary),
    onClick: () => applyPreset(preset.key),
  }));

  const recordGroups: BasicForceRecordGroup[] = [
    {
      key: "pinhole-runs",
      title: isZh ? "小孔成像记录单" : "Pinhole Imaging Worksheet",
      countLabel: `${Object.keys(records).length} / 3`,
      isActive: true,
      helper: isZh ? "建议按“物距、像距、小孔大小”三组顺序记录。" : "Record the three comparisons in order: object distance, screen distance, and aperture.",
      conclusion: buildConclusion({ isZh, records }),
      rows: Object.values(PRESETS).map((preset) => {
        const record = records[preset.key];
        return record
          ? {
              key: preset.key,
              label: isZh ? preset.label : preset.label,
              value: `${formatNumber(record.imageHeightCm)} cm`,
              note: record.note,
            }
          : {
              key: preset.key,
              label: isZh ? preset.label : preset.label,
              value: isZh ? "待测" : "Pending",
              note: isZh ? "先调整参数，再记录结果。" : "Adjust the scene first, then record the result.",
              isPending: true,
            };
      }),
    },
  ];

  const summaryItems = [
    {
      label: isZh ? "物距 u" : "Object distance",
      value: `${formatNumber(objectDistanceCm)} cm`,
    },
    {
      label: isZh ? "像距 v" : "Screen distance",
      value: `${formatNumber(screenDistanceCm)} cm`,
    },
    {
      label: isZh ? "像高 h" : "Image height",
      value: `${formatNumber(metrics.imageHeightCm)} cm`,
    },
    {
      label: isZh ? "清晰度" : "Clarity",
      value: `${metrics.clarity}%`,
    },
  ];

  function applyPreset(key: PinholePresetKey) {
    const preset = PRESETS[key];
    setActivePreset(key);
    setObjectDistanceCm(preset.objectDistanceCm);
    setScreenDistanceCm(preset.screenDistanceCm);
    setApertureMm(preset.apertureMm);
  }

  function recordCurrentRun() {
    const preset = PRESETS[activePreset];
    const note = buildRecordNote({
      activePreset,
      isZh,
      objectDistanceCm,
      screenDistanceCm,
      apertureMm,
      metrics,
    });

    setRecords((previous) => ({
      ...previous,
      [activePreset]: {
        imageHeightCm: metrics.imageHeightCm,
        clarity: metrics.clarity,
        brightness: metrics.brightness,
        note,
      },
    }));

    const nextPreset = getNextPreset(activePreset);
    if (nextPreset) {
      applyPreset(nextPreset);
    } else {
      applyPreset(preset.key);
    }
  }

  function resetLab() {
    setRecords({});
    applyPreset("object-distance");
  }

  return (
    <TeachingLabShell
      panelStorageKey={PANEL_STORAGE_KEY}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      fullscreenRef={fullscreenRef}
      controlTitle={isZh ? "参数控制" : "Control Panel"}
      controlCopy={isZh ? "围绕物距、像距和小孔大小观察倒立实像。" : "Observe how object distance, screen distance, and aperture size change the inverted real image."}
      statusItems={[
        <StatusPill key="topic" tone="active">{isZh ? "光的直线传播" : "Rectilinear Propagation"}</StatusPill>,
        <StatusPill key="status" tone="balanced">{isZh ? "倒立实像" : "Inverted Real Image"}</StatusPill>,
      ]}
      rootClassName="pinhole-lab-shell"
      panelClassName="pinhole-control-panel"
      mainClassName="pinhole-lab-main"
      controlContent={
        <>
          <ControlPanelSection
            title={isZh ? "课堂步骤" : "Class Steps"}
            hint={isZh ? "先按预设，再微调参数" : "Use the preset first, then fine-tune"}
            accent
          >
            <ControlStepGroup items={stepItems} className="control-step-group is-panel" />
            <p className="force-inline-copy">{tt(PRESETS[activePreset].summary)}</p>
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "核心参数" : "Core Parameters"}
            hint={isZh ? "三项参数决定像的大小、清晰度和亮度" : "These parameters control size, sharpness, and brightness"}
          >
            <ControlRange
              id="pinhole-object-distance"
              label={isZh ? "物距 u" : "Object distance u"}
              min={OBJECT_DISTANCE_MIN}
              max={OBJECT_DISTANCE_MAX}
              step={1}
              unit="cm"
              editable
              value={objectDistanceCm}
              onChange={setObjectDistanceCm}
            />
            <ControlRange
              id="pinhole-screen-distance"
              label={isZh ? "像距 v" : "Screen distance v"}
              min={SCREEN_DISTANCE_MIN}
              max={SCREEN_DISTANCE_MAX}
              step={1}
              unit="cm"
              editable
              value={screenDistanceCm}
              onChange={setScreenDistanceCm}
            />
            <ControlRange
              id="pinhole-aperture"
              label={isZh ? "小孔直径 d" : "Aperture d"}
              min={APERTURE_MIN}
              max={APERTURE_MAX}
              step={0.5}
              unit="mm"
              editable
              value={apertureMm}
              onChange={setApertureMm}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "操作与记录" : "Observe & Record"}
            hint={isZh ? "看清像的变化，再记录本组" : "Observe the image first, then record"}
          >
            <div className="force-action-grid">
              <ControlButton variant="primary" onClick={recordCurrentRun}>
                {isZh ? "记录本组" : "Record This Run"}
              </ControlButton>
              <ControlButton variant="ghost" onClick={() => applyPreset(activePreset)}>
                {isZh ? "恢复预设" : "Restore Preset"}
              </ControlButton>
              <ControlButton variant="ghost" onClick={resetLab}>
                {tt("重置")}
              </ControlButton>
            </div>

            <p className="force-inline-copy">
              {isZh
                ? `当前像高满足 h/H = v/u。此时 h ≈ ${formatNumber(metrics.imageHeightCm)} cm，像保持倒立，像形只由物体决定。`
                : `The image follows h/H = v/u. Here h is about ${formatNumber(metrics.imageHeightCm)} cm and stays inverted, while the image shape depends on the object instead of the aperture.`}
            </p>

            <BasicForceRecordTable
              groups={recordGroups}
              emptyTitle={isZh ? "先完成第一组观察" : "Finish the first observation"}
              emptyCopy={isZh ? "建议先记录物距变化，再记录像距和小孔大小对成像的影响。" : "Start with object-distance changes, then record screen distance and aperture effects."}
              pendingCopy={isZh ? "待测" : "Pending"}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "思考提示" : "Think Prompt"}
            hint={isZh ? "围绕公式与生活现象提问" : "Link the formula back to real examples"}
          >
            <ul className="force-support-question-list">
              <li>{isZh ? "为什么树荫下的圆形光斑和树叶形状无关？" : "Why are the bright spots under trees circular instead of leaf-shaped?"}</li>
              <li>{isZh ? "小孔变大后为什么会变亮却变模糊？" : "Why does a larger aperture make the image brighter but blurrier?"}</li>
              <li>{isZh ? "如果物体继续远离小孔，像会怎样变化？" : "What happens if the object moves even farther away from the pinhole?"}</li>
            </ul>
          </ControlPanelSection>
        </>
      }
      stageContent={
        <div className="visual-canvas force-stage-canvas pinhole-stage-canvas is-2d-mode">
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
                <StatusPill tone="balanced">{tt(PRESETS[activePreset].label)}</StatusPill>
              </div>
              <p className="pressure-stage-copy">{tt(PRESETS[activePreset].summary)}</p>
              <div className="force-stage-chip-grid">
                <span className="force-stage-chip">{`h/H = ${formatRatio(metrics.ratio)}`}</span>
                <span className="force-stage-chip">{isZh ? "像始终倒立" : "Image stays inverted"}</span>
              </div>
            </div>
          </div>

          <div className="force-stage-overlay is-bottom-left">
            <div className="force-stage-hud-card is-tight">
              <div className="force-stage-hud-head">
                <span className="force-stage-hud-title">{isZh ? "实时读数" : "Live Reading"}</span>
              </div>
              <div className="pressure-stage-metric-grid">
                {summaryItems.map((item) => (
                  <article key={item.label} className="force-stage-result-pill">
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </article>
                ))}
              </div>
              <p className="pressure-stage-formula">
                {isZh
                  ? `亮度 ${metrics.brightness}% · 小孔越小越清晰，小孔越大越模糊。`
                  : `Brightness ${metrics.brightness}% · Smaller pinholes sharpen the image, while larger ones blur it.`}
              </p>
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
                  <span>{isZh ? "物体高度 H" : "Object height H"}</span>
                  <strong>{`${OBJECT_HEIGHT_CM} cm`}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "亮度" : "Brightness"}</span>
                  <strong>{`${metrics.brightness}%`}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "小孔直径" : "Aperture"}</span>
                  <strong>{`${formatNumber(apertureMm)} mm`}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "已记录" : "Recorded"}</span>
                  <strong>{`${Object.keys(records).length} / 3`}</strong>
                </article>
              </div>
            </div>
          </div>

          <svg
            viewBox="0 0 1160 760"
            className="force-stage-svg pinhole-stage-svg"
            role="img"
            aria-label={isZh ? `${topic.title}可视化示意图` : `${topic.title} visualization`}
          >
            <defs>
              <linearGradient id="pinhole-object-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
              <linearGradient id="pinhole-screen-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(125, 211, 252, 0.95)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0.28)" />
              </linearGradient>
            </defs>

            <rect x="74" y="88" width="1012" height="560" rx="36" className="motion-stage-panel-shell" />
            <text x="110" y="126" className="motion-stage-panel-title">{isZh ? "小孔成像实验台" : "Pinhole Imaging Bench"}</text>
            <text x="110" y="152" className="motion-stage-panel-copy">
              {isZh ? "让物体、小孔和光屏保持同一高度，观察倒立实像如何随 u、v 和 d 变化。" : "Keep the object, pinhole, and screen aligned and observe how the inverted image changes with u, v, and d."}
            </text>

            <line x1="148" y1="532" x2="1010" y2="532" className="ohms-stage-wire" />

            <g>
              <line x1={metrics.objectX} y1="548" x2={metrics.objectX} y2={metrics.objectBaseY} className="pinhole-stage-guide" />
              <path
                d={`M ${metrics.objectX} ${metrics.objectBaseY} L ${metrics.objectX} ${metrics.objectTopY} M ${metrics.objectX} ${metrics.objectTopY} L ${metrics.objectX - 18} ${metrics.objectTopY + 26} M ${metrics.objectX} ${metrics.objectTopY} L ${metrics.objectX + 18} ${metrics.objectTopY + 26}`}
                className="pinhole-stage-object-arrow"
              />
              <text x={metrics.objectX} y={metrics.objectBaseY + 34} textAnchor="middle" className="motion-stage-ruler-label">
                {isZh ? "物体" : "Object"}
              </text>
            </g>

            <g>
              <rect x="560" y="194" width="30" height="328" rx="14" className="pinhole-stage-board" />
              <rect x="573" y={metrics.pinholeY - metrics.apertureVisual / 2} width="4" height={metrics.apertureVisual} rx="3" className="pinhole-stage-aperture" />
              <text x="575" y="560" textAnchor="middle" className="motion-stage-ruler-label">
                {isZh ? "小孔板" : "Pinhole"}
              </text>
            </g>

            <g>
              <rect x={metrics.screenX} y="186" width="28" height="348" rx="14" className="pinhole-stage-screen" />
              <rect
                x={metrics.screenX + 7}
                y={metrics.imageTopY}
                width="14"
                height={metrics.imageHeightVisual}
                rx="7"
                fill="url(#pinhole-screen-gradient)"
                opacity={0.45 + metrics.brightness / 180}
                filter={`blur(${Math.max(0, (100 - metrics.clarity) / 18)}px)`}
              />
              <line x1={metrics.screenX + 14} y1="186" x2={metrics.screenX + 14} y2="534" className="pinhole-stage-guide" />
              <text x={metrics.screenX + 14} y="560" textAnchor="middle" className="motion-stage-ruler-label">
                {isZh ? "光屏" : "Screen"}
              </text>
            </g>

            <line x1={metrics.objectX} y1={metrics.objectTopY} x2="575" y2={metrics.pinholeY} className="pinhole-stage-ray" />
            <line x1={metrics.objectX} y1={metrics.objectBaseY} x2="575" y2={metrics.pinholeY} className="pinhole-stage-ray" />
            <line x1="575" y1={metrics.pinholeY} x2={metrics.screenX + 14} y2={metrics.imageBottomY} className="pinhole-stage-ray" />
            <line x1="575" y1={metrics.pinholeY} x2={metrics.screenX + 14} y2={metrics.imageTopY} className="pinhole-stage-ray" />

            <line x1="136" y1={metrics.objectBaseY} x2="1020" y2={metrics.objectBaseY} className="pinhole-stage-axis" />
            <text x="140" y={metrics.objectBaseY - 12} className="motion-stage-ruler-label">{isZh ? "主光轴" : "Axis"}</text>

            <g className="pinhole-stage-ruler">
              <line x1={metrics.objectX} y1="604" x2="575" y2="604" className="pressure-stage-measure-line" />
              <line x1={metrics.objectX} y1="594" x2={metrics.objectX} y2="614" className="pressure-stage-measure-cap" />
              <line x1="575" y1="594" x2="575" y2="614" className="pressure-stage-measure-cap" />
              <text x={(metrics.objectX + 575) / 2} y="628" textAnchor="middle" className="pressure-stage-label">
                {isZh ? `物距 u = ${formatNumber(objectDistanceCm)} cm` : `u = ${formatNumber(objectDistanceCm)} cm`}
              </text>

              <line x1="575" y1="656" x2={metrics.screenX + 14} y2="656" className="pressure-stage-measure-line" />
              <line x1="575" y1="646" x2="575" y2="666" className="pressure-stage-measure-cap" />
              <line x1={metrics.screenX + 14} y1="646" x2={metrics.screenX + 14} y2="666" className="pressure-stage-measure-cap" />
              <text x={(575 + metrics.screenX + 14) / 2} y="684" textAnchor="middle" className="pressure-stage-label">
                {isZh ? `像距 v = ${formatNumber(screenDistanceCm)} cm` : `v = ${formatNumber(screenDistanceCm)} cm`}
              </text>
            </g>
          </svg>
        </div>
      }
    />
  );
}

function buildPinholeMetrics({
  objectDistanceCm,
  screenDistanceCm,
  apertureMm,
}: {
  objectDistanceCm: number;
  screenDistanceCm: number;
  apertureMm: number;
}) {
  const ratio = screenDistanceCm / objectDistanceCm;
  const imageHeightCm = OBJECT_HEIGHT_CM * ratio;
  const clarity = clamp(Math.round(96 - (apertureMm - 1) * 10), 48, 96);
  const brightness = clamp(Math.round(38 + apertureMm * 11), 36, 100);
  const objectX = 575 - objectDistanceCm * 11.2;
  const screenX = 575 + screenDistanceCm * 10.4;
  const objectHeightVisual = OBJECT_HEIGHT_CM * 18;
  const imageHeightVisual = imageHeightCm * 18;
  const objectBaseY = 492;
  const pinholeY = 346;

  return {
    ratio,
    imageHeightCm,
    clarity,
    brightness,
    objectX,
    screenX,
    objectBaseY,
    pinholeY,
    objectTopY: objectBaseY - objectHeightVisual,
    imageTopY: pinholeY,
    imageBottomY: pinholeY + imageHeightVisual,
    imageHeightVisual,
    apertureVisual: 18 + apertureMm * 8,
  };
}

function buildRecordNote({
  activePreset,
  isZh,
  objectDistanceCm,
  screenDistanceCm,
  apertureMm,
  metrics,
}: {
  activePreset: PinholePresetKey;
  isZh: boolean;
  objectDistanceCm: number;
  screenDistanceCm: number;
  apertureMm: number;
  metrics: ReturnType<typeof buildPinholeMetrics>;
}) {
  if (activePreset === "object-distance") {
    return isZh
      ? `u=${formatNumber(objectDistanceCm)} cm，物体越远，像缩小到 ${formatNumber(metrics.imageHeightCm)} cm。`
      : `u=${formatNumber(objectDistanceCm)} cm, and the image shrinks to ${formatNumber(metrics.imageHeightCm)} cm as the object moves away.`;
  }

  if (activePreset === "screen-distance") {
    return isZh
      ? `v=${formatNumber(screenDistanceCm)} cm，光屏后移后像增大到 ${formatNumber(metrics.imageHeightCm)} cm。`
      : `v=${formatNumber(screenDistanceCm)} cm, and moving the screen back enlarges the image to ${formatNumber(metrics.imageHeightCm)} cm.`;
  }

  return isZh
    ? `d=${formatNumber(apertureMm)} mm，亮度 ${metrics.brightness}% ，清晰度 ${metrics.clarity}% 。`
    : `d=${formatNumber(apertureMm)} mm, brightness ${metrics.brightness}% and clarity ${metrics.clarity}%.`;
}

function buildConclusion({
  isZh,
  records,
}: {
  isZh: boolean;
  records: Partial<Record<PinholePresetKey, PinholeRecord>>;
}) {
  if (Object.keys(records).length < 3) {
    return isZh ? "三组记录补齐后，可统一归纳“u、v、d 分别影响像的大小、清晰度和亮度”。" : "Complete all three runs to summarize how u, v, and d affect size, sharpness, and brightness.";
  }

  return isZh
    ? "归纳：小孔成像一定是倒立实像；物距增大像变小，像距增大像变大；小孔越小越清晰但更暗。"
    : "Summary: a pinhole always forms an inverted real image; increasing object distance shrinks the image, increasing screen distance enlarges it, and a smaller aperture sharpens the image but dims it.";
}

function getNextPreset(current: PinholePresetKey) {
  if (current === "object-distance") {
    return "screen-distance";
  }
  if (current === "screen-distance") {
    return "aperture-size";
  }
  return null;
}

function formatNumber(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

function formatRatio(value: number) {
  return value.toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
