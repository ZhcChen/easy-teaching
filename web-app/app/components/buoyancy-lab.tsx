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

type BuoyancyLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type BuoyancySceneKey = "air" | "partial" | "submerged" | "dense-liquid" | "overflow";

type BuoyancyPreset = {
  key: BuoyancySceneKey;
  stepLabel: string;
  label: string;
  summary: string;
  immersionDepthCm: number;
  liquidDensity: number;
  objectWeight: number;
};

type BuoyancyRecord = {
  value: string;
  note: string;
};

const PANEL_STORAGE_KEY = "easy-teaching.buoyancy.panel-collapsed";
const BLOCK_HEIGHT_CM = 10;
const FULL_VOLUME_CM3 = 100;
const FULL_BUOYANCY_WATER_N = 0.98;

const PRESETS: Record<BuoyancySceneKey, BuoyancyPreset> = {
  air: {
    key: "air",
    stepLabel: "1",
    label: "空气中称重",
    summary: "物体悬挂在空气中时，弹簧测力计读数等于物体重力 G。",
    immersionDepthCm: 0,
    liquidDensity: 1000,
    objectWeight: 2.4,
  },
  partial: {
    key: "partial",
    stepLabel: "2",
    label: "部分浸入",
    summary: "物体逐渐浸入液体，排开液体体积增加，浮力逐渐增大。",
    immersionDepthCm: 5,
    liquidDensity: 1000,
    objectWeight: 2.4,
  },
  submerged: {
    key: "submerged",
    stepLabel: "3",
    label: "完全浸没",
    summary: "物体完全浸没后，浮力达到与排液体积对应的最大值。",
    immersionDepthCm: 10,
    liquidDensity: 1000,
    objectWeight: 2.4,
  },
  "dense-liquid": {
    key: "dense-liquid",
    stepLabel: "4",
    label: "换高密度液体",
    summary: "在相同排液体积下，液体密度越大，浮力越大，测力计读数越小。",
    immersionDepthCm: 10,
    liquidDensity: 1200,
    objectWeight: 2.4,
  },
  overflow: {
    key: "overflow",
    stepLabel: "5",
    label: "排液验证",
    summary: "让排开的液体流入小桶，对照测力计减小的示数，验证 F浮 = G排。",
    immersionDepthCm: 10,
    liquidDensity: 1000,
    objectWeight: 2.4,
  },
};

export function BuoyancyLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: BuoyancyLabProps) {
  const { isZh, tt } = useLocale();
  const [scene, setScene] = useState<BuoyancySceneKey>("air");
  const [immersionDepthCm, setImmersionDepthCm] = useState(PRESETS.air.immersionDepthCm);
  const [liquidDensity, setLiquidDensity] = useState(PRESETS.air.liquidDensity);
  const [objectWeight, setObjectWeight] = useState(PRESETS.air.objectWeight);
  const [records, setRecords] = useState<Partial<Record<BuoyancySceneKey, BuoyancyRecord>>>({});

  const metrics = useMemo(
    () => buildBuoyancyMetrics({ scene, immersionDepthCm, liquidDensity, objectWeight, isZh }),
    [immersionDepthCm, isZh, liquidDensity, objectWeight, scene],
  );

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
      key: "buoyancy-worksheet",
      title: isZh ? "浮力实验记录单" : "Buoyancy Worksheet",
      countLabel: `${Object.keys(records).length} / 5`,
      isActive: true,
      helper: isZh ? "建议按“空气中 → 部分浸入 → 完全浸没 → 换液体 → 排液验证”的顺序记录。" : "Record the sequence from air to partial immersion, full immersion, denser liquid, and overflow verification.",
      conclusion:
        Object.keys(records).length < 5
          ? (isZh ? "补齐五组记录后，就能完整讲清“体积、液体密度、深度无关、阿基米德原理”。" : "Complete all five scenes to explain volume, liquid density, depth independence, and Archimedes' principle.")
          : (isZh ? "归纳：浮力随排液体积和液体密度增大而增大；完全浸没后继续下移，浮力不再变化；排开液体的重力等于浮力。" : "Summary: buoyancy grows with displaced volume and liquid density, stays unchanged after full submersion, and equals the weight of the displaced liquid."),
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
              note: isZh ? "先观察读数和排液，再记录结果。" : "Observe the reading and displaced liquid before recording.",
              isPending: true,
            };
      }),
    },
  ];

  function applyPreset(nextScene: BuoyancySceneKey) {
    const preset = PRESETS[nextScene];
    setScene(nextScene);
    setImmersionDepthCm(preset.immersionDepthCm);
    setLiquidDensity(preset.liquidDensity);
    setObjectWeight(preset.objectWeight);
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
    applyPreset("air");
  }

  return (
    <TeachingLabShell
      panelStorageKey={PANEL_STORAGE_KEY}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      fullscreenRef={fullscreenRef}
      controlTitle={isZh ? "参数控制" : "Control Panel"}
      controlCopy={isZh ? "围绕浸入深度、液体密度和物体重力，观察浮力、测力计和排液之间的关系。" : "Observe how immersion depth, liquid density, and object weight connect buoyancy, spring-balance readings, and displaced liquid."}
      statusItems={[
        <StatusPill key="topic" tone="active">{isZh ? "浮力与阿基米德原理" : "Buoyancy & Archimedes"}</StatusPill>,
        <StatusPill key="status" tone={metrics.statusTone}>{metrics.statusLabel}</StatusPill>,
      ]}
      rootClassName="buoyancy-lab-shell"
      panelClassName="buoyancy-control-panel"
      mainClassName="buoyancy-lab-main"
      controlContent={
        <>
          <ControlPanelSection
            title={isZh ? "课堂步骤" : "Class Steps"}
            hint={isZh ? "五组场景基本覆盖核心知识点" : "Five scenes cover the core ideas"}
            accent
          >
            <ControlStepGroup items={stepItems} className="control-step-group is-panel" />
            <p className="force-inline-copy">{tt(PRESETS[scene].summary)}</p>
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "核心参数" : "Core Parameters"}
            hint={isZh ? "深度决定排液体积，密度决定单位体积浮力" : "Depth sets displaced volume, density sets buoyancy per volume"}
          >
            <ControlRange
              id="buoyancy-depth"
              label={isZh ? "浸入深度" : "Immersion depth"}
              min={0}
              max={16}
              step={1}
              unit="cm"
              editable
              value={immersionDepthCm}
              onChange={setImmersionDepthCm}
            />
            <ControlRange
              id="buoyancy-density"
              label={isZh ? "液体密度" : "Liquid density"}
              min={800}
              max={1300}
              step={10}
              unit="kg/m³"
              editable
              value={liquidDensity}
              onChange={setLiquidDensity}
            />
            <ControlRange
              id="buoyancy-weight"
              label={isZh ? "物体重力" : "Object weight"}
              min={0.8}
              max={3.2}
              step={0.1}
              unit="N"
              editable
              value={objectWeight}
              onChange={setObjectWeight}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "操作与记录" : "Observe & Record"}
            hint={isZh ? "观察浮力、示数和排液后记录本组" : "Record after observing buoyancy, reading, and displaced liquid"}
          >
            <div className="force-action-grid">
              <ControlButton variant="primary" onClick={recordCurrentScene}>
                {isZh ? "记录本组" : "Record This Run"}
              </ControlButton>
              <ControlButton variant="ghost" onClick={() => applyPreset(scene)}>
                {isZh ? "恢复预设" : "Restore Preset"}
              </ControlButton>
              <ControlButton variant="ghost" onClick={resetLab}>
                {tt("重置")}
              </ControlButton>
            </div>

            <p className="force-inline-copy">{metrics.summary}</p>

            <BasicForceRecordTable
              groups={recordGroups}
              emptyTitle={isZh ? "先完成第一组观察" : "Finish the first observation"}
              emptyCopy={isZh ? "建议先固定液体密度和物体重力，再对比浸入深度与排液变化。" : "Keep the liquid density and object weight fixed first, then compare immersion depth and displaced liquid."}
              pendingCopy={isZh ? "待测" : "Pending"}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "思考提示" : "Think Prompt"}
            hint={isZh ? "把实验和生活应用连接起来" : "Connect the experiment to daily-life examples"}
          >
            <ul className="force-support-question-list">
              <li>{isZh ? "为什么人在死海里更容易漂浮？" : "Why is it easier to float in the Dead Sea?"}</li>
              <li>{isZh ? "物体完全浸没后继续下移，为什么浮力并不会无限增大？" : "Why does buoyancy stop increasing after full submersion?"}</li>
              <li>{isZh ? "潜水艇是通过改变液体密度还是自身平均密度来上浮和下潜？" : "Does a submarine change the liquid density or its own average density to rise and sink?"}</li>
            </ul>
          </ControlPanelSection>
        </>
      }
      stageContent={
        <div className="visual-canvas force-stage-canvas buoyancy-stage-canvas teaching-overlay-stage-canvas is-2d-mode">
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
                <span className="force-stage-chip">{metrics.releaseStateLabel}</span>
                <span className="force-stage-chip">{metrics.densityLabel}</span>
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
                  <strong>{`${formatNumber(objectWeight)} N`}</strong>
                  <span>{isZh ? "重力 G" : "Weight G"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{`${formatNumber(metrics.buoyancyN)} N`}</strong>
                  <span>{isZh ? "浮力 F浮" : "Buoyancy"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{`${formatNumber(metrics.scaleReadingN)} N`}</strong>
                  <span>{isZh ? "测力计示数" : "Scale reading"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{`${formatNumber(metrics.displacedWeightN)} N`}</strong>
                  <span>{isZh ? "排液重力" : "Displaced liquid"}</span>
                </article>
              </div>
              <p className="pressure-stage-formula">{metrics.formulaCopy}</p>
            </div>
          </div>

          <div className="force-stage-overlay is-bottom-right">
            <div className="force-stage-hud-card is-tight shadow-stage-summary-card">
              <div className="force-stage-hud-head">
                <span className="force-stage-hud-title">{isZh ? "课堂摘要" : "Classroom Summary"}</span>
                <span className="force-stage-chip">{`${Object.keys(records).length} / 5`}</span>
              </div>
              <div className="shadow-stage-summary-grid">
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "浸没比例" : "Submerged"}</span>
                  <strong>{`${metrics.submergedPercent}%`}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "液体密度" : "Density"}</span>
                  <strong>{`${liquidDensity} kg/m³`}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "若松手" : "If released"}</span>
                  <strong>{metrics.releaseStateLabel}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "已记录" : "Recorded"}</span>
                  <strong>{`${Object.keys(records).length} / 5`}</strong>
                </article>
              </div>
            </div>
          </div>

          <svg
            viewBox="0 0 1160 760"
            className="force-stage-svg buoyancy-stage-svg"
            role="img"
            aria-label={isZh ? `${topic.title}可视化示意图` : `${topic.title} visualization`}
          >
            <defs>
              <linearGradient id="buoyancy-water" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(103, 198, 255, 0.28)" />
                <stop offset="100%" stopColor="rgba(37, 99, 235, 0.66)" />
              </linearGradient>
              <linearGradient id="buoyancy-block" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
            </defs>

            <rect x="74" y="88" width="1012" height="560" rx="36" className="motion-stage-panel-shell" />
            <text x="110" y="126" className="motion-stage-panel-title">{isZh ? "浮力实验台" : "Buoyancy Bench"}</text>
            <text x="110" y="152" className="motion-stage-panel-copy">
              {isZh ? "观察弹簧测力计示数、排液和浮力箭头如何随浸入深度与液体密度变化。" : "Observe how the spring reading, displaced liquid, and buoyancy arrow change with immersion depth and liquid density."}
            </text>

            <g>
              <path d="M 252 182 L 298 182 L 308 214 L 242 214 Z" className="force-stage-scale-ring" />
              <rect x="238" y="214" width="74" height="168" rx="26" className="force-stage-scale-body" />
              <rect x="258" y="238" width="34" height="110" rx="17" className="force-stage-scale-window" />
              <line x1="275" y1="246" x2="275" y2="338" className="force-stage-scale-indicator" />
              <line x1="275" y1="246" x2="275" y2={246 + metrics.scaleIndicatorOffset} className="buoyancy-stage-scale-pointer" />
              <line x1="275" y1="382" x2="275" y2="420" className="force-stage-scale-hook" />
              <text x="275" y="438" textAnchor="middle" className="motion-stage-ruler-label">{isZh ? "弹簧测力计" : "Scale"}</text>
            </g>

            <g>
              <rect x="382" y="224" width="308" height="298" rx="22" className="buoyancy-stage-beaker" />
              <rect x="398" y={metrics.liquidSurfaceY} width="276" height={506 - metrics.liquidSurfaceY} rx="16" fill="url(#buoyancy-water)" className="buoyancy-stage-liquid" />
              <line x1="398" y1={metrics.liquidSurfaceY} x2="674" y2={metrics.liquidSurfaceY} className="buoyancy-stage-surface" />
              <text x="416" y={metrics.liquidSurfaceY - 14} className="force-svg-copy">{metrics.densityLabel}</text>
            </g>

            <g>
              <line x1="275" y1="420" x2="536" y2={metrics.blockTopY - 8} className="force-stage-rope" />
              <rect x="500" y={metrics.blockTopY} width="72" height="140" rx="18" fill="url(#buoyancy-block)" className="buoyancy-stage-block" />
              <text x="536" y={metrics.blockTopY + 166} textAnchor="middle" className="motion-stage-ruler-label">{isZh ? "金属块" : "Block"}</text>
            </g>

            <line x1="720" y1="264" x2="720" y2="506" className="pressure-stage-measure-line" />
            <line x1="708" y1={metrics.blockTopY} x2="732" y2={metrics.blockTopY} className="pressure-stage-measure-cap" />
            <line x1="708" y1={metrics.blockBottomY} x2="732" y2={metrics.blockBottomY} className="pressure-stage-measure-cap" />
            <text x="742" y={(metrics.blockTopY + metrics.blockBottomY) / 2} className="force-svg-copy">{isZh ? `浸入 ${metrics.submergedPercent}%` : `${metrics.submergedPercent}% submerged`}</text>

            <line x1="536" y1={metrics.blockTopY + 14} x2="536" y2={metrics.blockTopY - 86} className="buoyancy-stage-force is-up" />
            <path d={`M 536 ${metrics.blockTopY - 96} L 524 ${metrics.blockTopY - 72} H 548 Z`} className="buoyancy-stage-force-head is-up" />
            <text x="554" y={metrics.blockTopY - 66} className="force-svg-copy">{isZh ? `F浮 ${formatNumber(metrics.buoyancyN)} N` : `F_b ${formatNumber(metrics.buoyancyN)} N`}</text>

            <line x1="536" y1={metrics.blockBottomY - 12} x2="536" y2={metrics.blockBottomY + 94} className="buoyancy-stage-force is-down" />
            <path d={`M 536 ${metrics.blockBottomY + 104} L 524 ${metrics.blockBottomY + 80} H 548 Z`} className="buoyancy-stage-force-head is-down" />
            <text x="552" y={metrics.blockBottomY + 82} className="force-svg-copy">{isZh ? `G ${formatNumber(objectWeight)} N` : `G ${formatNumber(objectWeight)} N`}</text>

            {scene === "overflow" ? (
              <g>
                <path d="M 734 312 L 804 312 L 820 350 L 718 350 Z" className="buoyancy-stage-spout" />
                <rect x="846" y="386" width="96" height="124" rx="20" className="buoyancy-stage-bucket" />
                <rect x="858" y={510 - metrics.bucketLiquidHeight} width="72" height={metrics.bucketLiquidHeight} rx="16" fill="url(#buoyancy-water)" className="buoyancy-stage-bucket-liquid" />
                <text x="894" y="536" textAnchor="middle" className="motion-stage-ruler-label">{isZh ? "排液小桶" : "Bucket"}</text>
                <text x="846" y="354" className="force-svg-copy">{isZh ? `G排 ≈ ${formatNumber(metrics.displacedWeightN)} N` : `W_disp ≈ ${formatNumber(metrics.displacedWeightN)} N`}</text>
              </g>
            ) : null}
          </svg>
        </div>
      }
    />
  );
}

function buildBuoyancyMetrics({
  scene,
  immersionDepthCm,
  liquidDensity,
  objectWeight,
  isZh,
}: {
  scene: BuoyancySceneKey;
  immersionDepthCm: number;
  liquidDensity: number;
  objectWeight: number;
  isZh: boolean;
}) {
  const submergedFraction = clamp(immersionDepthCm / BLOCK_HEIGHT_CM, 0, 1);
  const fullBuoyancyN = FULL_BUOYANCY_WATER_N * (liquidDensity / 1000);
  const buoyancyN = fullBuoyancyN * submergedFraction;
  const displacedVolumeCm3 = FULL_VOLUME_CM3 * submergedFraction;
  const displacedWeightN = buoyancyN;
  const scaleReadingN = Math.max(0, objectWeight - buoyancyN);
  const releaseStateLabel = fullBuoyancyN > objectWeight + 0.02
    ? (isZh ? "若松手将上浮" : "Would float up")
    : Math.abs(fullBuoyancyN - objectWeight) <= 0.02
      ? (isZh ? "若松手可悬浮" : "Would stay suspended")
      : (isZh ? "若松手会下沉" : "Would sink");
  const statusLabel = scene === "air"
    ? (isZh ? "空气中称重" : "In air")
    : scene === "overflow"
      ? (isZh ? "验证阿基米德原理" : "Archimedes verified")
      : submergedFraction < 1
        ? (isZh ? "浮力逐渐增大" : "Buoyancy rising")
        : (isZh ? "已完全浸没" : "Fully submerged");
  const statusTone = scene === "overflow" ? "balanced" as const : submergedFraction < 1 ? "active" as const : "warning" as const;
  const summary = scene === "overflow"
    ? (isZh ? `当前排液重力约 ${formatNumber(displacedWeightN)} N，与浮力 ${formatNumber(buoyancyN)} N 对应，验证 F浮 = G排。` : `The displaced-liquid weight is about ${formatNumber(displacedWeightN)} N, matching the buoyancy of ${formatNumber(buoyancyN)} N, so F_b = W_disp.`)
    : submergedFraction < 1
      ? (isZh ? `浸入越深，排液体积约 ${formatNumber(displacedVolumeCm3)} cm³，浮力增大到 ${formatNumber(buoyancyN)} N。` : `Deeper immersion displaces about ${formatNumber(displacedVolumeCm3)} cm³, raising buoyancy to ${formatNumber(buoyancyN)} N.`)
      : (isZh ? `完全浸没后继续下移，排液体积不再增加，所以浮力保持在 ${formatNumber(buoyancyN)} N。` : `Once fully submerged, moving deeper does not increase displaced volume, so buoyancy stays at ${formatNumber(buoyancyN)} N.`)
  ;
  const formulaCopy = isZh
    ? `称重法：F浮 = G - F拉 = ${formatNumber(objectWeight)} - ${formatNumber(scaleReadingN)} ≈ ${formatNumber(buoyancyN)} N。`
    : `Using the weighing method: F_b = G - F_pull = ${formatNumber(objectWeight)} - ${formatNumber(scaleReadingN)} ≈ ${formatNumber(buoyancyN)} N.`;
  const submergedPercent = Math.round(submergedFraction * 100);
  const liquidSurfaceY = 326;
  const blockTopY = 236 + clamp(immersionDepthCm, 0, 16) * 17;
  const blockBottomY = blockTopY + 140;
  const bucketLiquidHeight = 20 + submergedFraction * 74;

  return {
    buoyancyN,
    displacedVolumeCm3,
    displacedWeightN,
    scaleReadingN,
    submergedPercent,
    releaseStateLabel,
    statusLabel,
    statusTone,
    summary,
    formulaCopy,
    recordValue: `${formatNumber(buoyancyN)} N`,
    densityLabel: isZh ? `ρ液=${liquidDensity} kg/m³` : `ρ=${liquidDensity} kg/m³`,
    liquidSurfaceY,
    blockTopY,
    blockBottomY,
    scaleIndicatorOffset: clamp((scaleReadingN / 3.2) * 92, 8, 98),
    bucketLiquidHeight,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}
