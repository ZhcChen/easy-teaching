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

type LightRefractionLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type RefractionSceneKey =
  | "air-water"
  | "water-air"
  | "vertical"
  | "total-internal"
  | "apparent-depth";

type RefractionPreset = {
  key: RefractionSceneKey;
  stepLabel: string;
  label: string;
  summary: string;
  incidentAngleDeg: number;
  waterDepthCm: number;
};

type RefractionRecord = {
  value: string;
  note: string;
};

const PANEL_STORAGE_KEY = "easy-teaching.light-refraction.panel-collapsed";

const PRESETS: Record<RefractionSceneKey, RefractionPreset> = {
  "air-water": {
    key: "air-water",
    stepLabel: "1",
    label: "空气→水",
    summary: "光从空气斜射入水中时，折射光线会向法线偏折，折射角小于入射角。",
    incidentAngleDeg: 36,
    waterDepthCm: 16,
  },
  "water-air": {
    key: "water-air",
    stepLabel: "2",
    label: "水→空气",
    summary: "光从水中斜射入空气时，折射光线会远离法线，折射角大于入射角。",
    incidentAngleDeg: 32,
    waterDepthCm: 16,
  },
  vertical: {
    key: "vertical",
    stepLabel: "3",
    label: "垂直入射",
    summary: "垂直入射时传播方向不变，折射角和入射角都等于 0°。",
    incidentAngleDeg: 0,
    waterDepthCm: 16,
  },
  "total-internal": {
    key: "total-internal",
    stepLabel: "4",
    label: "全反射",
    summary: "光从高折射率介质射向低折射率介质且超过临界角时，不再有折射光线，只剩反射光线。",
    incidentAngleDeg: 54,
    waterDepthCm: 16,
  },
  "apparent-depth": {
    key: "apparent-depth",
    stepLabel: "5",
    label: "池水变浅",
    summary: "水底光线折射进入空气后，人眼逆着折射光线看，会觉得水底位置上移。",
    incidentAngleDeg: 28,
    waterDepthCm: 24,
  },
};

const REFRACTIVE_INDEX = {
  air: 1.0,
  water: 1.33,
  glass: 1.5,
};

export function LightRefractionLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: LightRefractionLabProps) {
  const { isZh, tt } = useLocale();
  const [scene, setScene] = useState<RefractionSceneKey>("air-water");
  const [incidentAngleDeg, setIncidentAngleDeg] = useState(PRESETS["air-water"].incidentAngleDeg);
  const [waterDepthCm, setWaterDepthCm] = useState(PRESETS["air-water"].waterDepthCm);
  const [records, setRecords] = useState<Partial<Record<RefractionSceneKey, RefractionRecord>>>({});

  const metrics = useMemo(
    () => buildRefractionMetrics({ scene, incidentAngleDeg, waterDepthCm, isZh }),
    [incidentAngleDeg, isZh, scene, waterDepthCm],
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
      key: "refraction-runs",
      title: isZh ? "折射规律记录单" : "Refraction Worksheet",
      countLabel: `${Object.keys(records).length} / 5`,
      isActive: true,
      helper: isZh ? "建议按空气→水、水→空气、垂直入射、全反射、池水变浅的顺序记录。" : "Record air-to-water, water-to-air, normal incidence, total internal reflection, and apparent depth in order.",
      conclusion:
        Object.keys(records).length < 5
          ? (isZh ? "五组现象补齐后，就能完整串起“向法线 / 离法线 / 不偏折 / 全反射 / 视深变化”这条课堂主线。" : "Complete all five scenes to connect bending toward the normal, away from the normal, no bending, total internal reflection, and apparent-depth change.")
          : (isZh ? "归纳：从疏到密向法线，从密到疏离法线；垂直入射不偏折；超过临界角会全反射；折射让水底看起来更浅。" : "Summary: light bends toward the normal from thinner to denser media, away from the normal from denser to thinner media, vertical incidence does not bend, total internal reflection appears beyond the critical angle, and refraction makes underwater objects appear shallower."),
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
              note: isZh ? "先观察光路，再记录角度或现象。" : "Observe the ray path before recording the angle or phenomenon.",
              isPending: true,
            };
      }),
    },
  ];

  function applyPreset(nextScene: RefractionSceneKey) {
    const preset = PRESETS[nextScene];
    setScene(nextScene);
    setIncidentAngleDeg(preset.incidentAngleDeg);
    setWaterDepthCm(preset.waterDepthCm);
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
    applyPreset("air-water");
  }

  return (
    <TeachingLabShell
      panelStorageKey={PANEL_STORAGE_KEY}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      fullscreenRef={fullscreenRef}
      controlTitle={isZh ? "参数控制" : "Control Panel"}
      controlCopy={isZh ? "围绕法线、介质和入射角观察折射方向、全反射和视深变化。" : "Observe refraction direction, total internal reflection, and apparent depth through the normal, media, and the incident angle."}
      statusItems={[
        <StatusPill key="topic" tone="active">{isZh ? "光的折射" : "Refraction"}</StatusPill>,
        <StatusPill key="status" tone={metrics.statusTone}>{metrics.statusLabel}</StatusPill>,
      ]}
      rootClassName="refraction-lab-shell"
      panelClassName="refraction-control-panel"
      mainClassName="refraction-lab-main"
      controlContent={
        <>
          <ControlPanelSection
            title={isZh ? "课堂步骤" : "Class Steps"}
            hint={isZh ? "按五组典型现象推进课堂" : "Walk through five typical scenes"}
            accent
          >
            <ControlStepGroup items={stepItems} className="control-step-group is-panel" />
            <p className="force-inline-copy">{tt(PRESETS[scene].summary)}</p>
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "核心参数" : "Core Parameters"}
            hint={isZh ? "入射角决定偏折程度，水深决定视深差" : "Angle controls bending, depth controls apparent-depth shift"}
          >
            <ControlRange
              id="refraction-angle"
              label={isZh ? "入射角" : "Incident angle"}
              min={0}
              max={scene === "total-internal" ? 80 : 60}
              step={1}
              unit="°"
              editable
              value={incidentAngleDeg}
              onChange={setIncidentAngleDeg}
            />
            <ControlRange
              id="refraction-depth"
              label={isZh ? "水深 / 鱼深" : "Water depth"}
              min={8}
              max={30}
              step={1}
              unit="cm"
              editable
              value={waterDepthCm}
              disabled={scene !== "apparent-depth"}
              onChange={setWaterDepthCm}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "操作与记录" : "Observe & Record"}
            hint={isZh ? "看清偏折方向和角度变化，再记录本组" : "Observe bending direction and angle before recording"}
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
              emptyCopy={isZh ? "建议先看基本折射方向，再补垂直入射、全反射和池水变浅。" : "Start with the basic bending directions, then cover normal incidence, total internal reflection, and apparent depth."}
              pendingCopy={isZh ? "待测" : "Pending"}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "思考提示" : "Think Prompt"}
            hint={isZh ? "从生活现象反推规律" : "Work backward from everyday examples"}
          >
            <ul className="force-support-question-list">
              <li>{isZh ? "为什么从岸上看鱼，鱼会显得更靠近水面？" : "Why do fish look closer to the surface from the shore?"}</li>
              <li>{isZh ? "为什么钻石和光纤都和全反射有关？" : "Why are diamonds and fiber optics both related to total internal reflection?"}</li>
              <li>{isZh ? "垂直入射为什么方向不变，但速度仍然会改变？" : "Why does normal incidence keep the direction unchanged even though the speed changes?"}</li>
            </ul>
          </ControlPanelSection>
        </>
      }
      stageContent={
        <div className="visual-canvas force-stage-canvas refraction-stage-canvas teaching-overlay-stage-canvas is-2d-mode">
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
                <span className="force-stage-chip">{metrics.mediumLabel}</span>
                <span className="force-stage-chip">{metrics.directionLabel}</span>
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
                  <strong>{`${incidentAngleDeg}°`}</strong>
                  <span>{isZh ? "入射角" : "Incident angle"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{metrics.refractedAngleText}</strong>
                  <span>{isZh ? "折射角" : "Refracted angle"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{metrics.criticalAngleText}</strong>
                  <span>{isZh ? "临界角" : "Critical angle"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{scene === "apparent-depth" ? metrics.apparentDepthText : metrics.directionLabel}</strong>
                  <span>{scene === "apparent-depth" ? (isZh ? "视觉深度" : "Visual depth") : (isZh ? "偏折方向" : "Direction")}</span>
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
                  <span>{isZh ? "当前场景" : "Current scene"}</span>
                  <strong>{tt(PRESETS[scene].label)}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "方向结论" : "Direction"}</span>
                  <strong>{metrics.directionLabel}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "介质组合" : "Media"}</span>
                  <strong>{metrics.mediumLabel}</strong>
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
            className="force-stage-svg refraction-stage-svg"
            role="img"
            aria-label={isZh ? `${topic.title}可视化示意图` : `${topic.title} visualization`}
          >
            <rect x="74" y="88" width="1012" height="560" rx="36" className="motion-stage-panel-shell" />
            <text x="110" y="126" className="motion-stage-panel-title">{isZh ? "折射规律实验台" : "Refraction Bench"}</text>
            <text x="110" y="152" className="motion-stage-panel-copy">
              {scene === "apparent-depth"
                ? (isZh ? "看鱼的实际位置和视觉位置差异，理解“池水变浅”的原因。" : "Compare the real and apparent fish positions to understand why water looks shallower.")
                : (isZh ? "围绕界面、法线和角度观察光线如何偏折，以及何时会全反射。" : "Observe how the interface, the normal, and the angles determine bending and total internal reflection.")}
            </text>

            <rect x="124" y="196" width="912" height="188" className="refraction-stage-air" />
            <rect x="124" y="384" width="912" height="200" className="refraction-stage-water" />
            <line x1="124" y1="384" x2="1036" y2="384" className="refraction-stage-interface" />
            <line x1="580" y1="176" x2="580" y2="604" className="refraction-stage-normal" />
            <text x="598" y="212" className="motion-stage-ruler-label">{isZh ? "法线" : "Normal"}</text>

            {scene === "apparent-depth" ? (
              <ApparentDepthStage metrics={metrics} isZh={isZh} />
            ) : (
              <RayRefractionStage metrics={metrics} isZh={isZh} />
            )}
          </svg>
        </div>
      }
    />
  );
}

function RayRefractionStage({
  metrics,
  isZh,
}: {
  metrics: ReturnType<typeof buildRefractionMetrics>;
  isZh: boolean;
}) {
  return (
    <>
      <line x1={metrics.incidentStartX} y1={metrics.incidentStartY} x2="580" y2="384" className="refraction-stage-ray is-incident" />
      <line x1="580" y1="384" x2={metrics.refractedEndX} y2={metrics.refractedEndY} className="refraction-stage-ray is-refracted" />

      {metrics.showReflection ? (
        <line x1="580" y1="384" x2={metrics.reflectedEndX} y2={metrics.reflectedEndY} className="refraction-stage-ray is-reflected" />
      ) : null}

      <path d={`M 580 356 A 32 32 0 0 0 ${580 + metrics.incidentArcX} ${356 + metrics.incidentArcY}`} className="refraction-stage-angle-arc" />
      <path d={`M 580 412 A 34 34 0 0 ${metrics.refractedArcSweep} ${580 + metrics.refractedArcX} ${412 + metrics.refractedArcY}`} className="refraction-stage-angle-arc is-secondary" />

      <text x={metrics.incidentTextX} y={metrics.incidentTextY} className="force-svg-copy">{isZh ? `θ₁=${metrics.incidentAngleDeg}°` : `θ₁=${metrics.incidentAngleDeg}°`}</text>
      <text x={metrics.refractedTextX} y={metrics.refractedTextY} className="force-svg-copy">{isZh ? `θ₂=${metrics.refractedAngleText}` : `θ₂=${metrics.refractedAngleText}`}</text>

      <text x="180" y="244" className="motion-stage-ruler-label">{metrics.upperMediumLabel}</text>
      <text x="180" y="530" className="motion-stage-ruler-label">{metrics.lowerMediumLabel}</text>
    </>
  );
}

function ApparentDepthStage({
  metrics,
  isZh,
}: {
  metrics: ReturnType<typeof buildRefractionMetrics>;
  isZh: boolean;
}) {
  return (
    <>
      <circle cx="580" cy={metrics.fishActualY} r="14" className="refraction-stage-fish" />
      <circle cx="580" cy={metrics.fishVisualY} r="10" className="refraction-stage-fish-ghost" />
      <line x1="740" y1="258" x2="580" y2="384" className="refraction-stage-ray is-incident" />
      <line x1="580" y1="384" x2="580" y2={metrics.fishActualY} className="refraction-stage-ray is-refracted" />
      <line x1="740" y1="258" x2="580" y2={metrics.fishVisualY} className="refraction-stage-ray is-dashed" />
      <circle cx="740" cy="258" r="16" className="refraction-stage-eye" />
      <text x="766" y="264" className="motion-stage-ruler-label">{isZh ? "人眼" : "Eye"}</text>
      <text x="612" y={metrics.fishActualY + 6} className="force-svg-copy">{isZh ? `实际深度 ${metrics.actualDepthText}` : `Actual ${metrics.actualDepthText}`}</text>
      <text x="612" y={metrics.fishVisualY - 8} className="force-svg-copy">{isZh ? `视觉深度 ${metrics.apparentDepthText}` : `Visual ${metrics.apparentDepthText}`}</text>
      <text x="180" y="244" className="motion-stage-ruler-label">{isZh ? "空气" : "Air"}</text>
      <text x="180" y="530" className="motion-stage-ruler-label">{isZh ? "水" : "Water"}</text>
    </>
  );
}

function buildRefractionMetrics({
  scene,
  incidentAngleDeg,
  waterDepthCm,
  isZh,
}: {
  scene: RefractionSceneKey;
  incidentAngleDeg: number;
  waterDepthCm: number;
  isZh: boolean;
}) {
  let n1 = REFRACTIVE_INDEX.air;
  let n2 = REFRACTIVE_INDEX.water;
  let upperMediumLabel = isZh ? "空气" : "Air";
  let lowerMediumLabel = isZh ? "水" : "Water";

  if (scene === "water-air" || scene === "total-internal") {
    n1 = REFRACTIVE_INDEX.water;
    n2 = REFRACTIVE_INDEX.air;
    upperMediumLabel = isZh ? "水" : "Water";
    lowerMediumLabel = isZh ? "空气" : "Air";
  }

  if (scene === "total-internal") {
    n1 = REFRACTIVE_INDEX.glass;
    n2 = REFRACTIVE_INDEX.air;
    upperMediumLabel = isZh ? "玻璃" : "Glass";
    lowerMediumLabel = isZh ? "空气" : "Air";
  }

  const sin2 = n1 * Math.sin((incidentAngleDeg * Math.PI) / 180) / n2;
  const criticalAngle = n1 > n2 ? Math.asin(n2 / n1) * 180 / Math.PI : null;
  const totalInternal = scene === "total-internal" && criticalAngle !== null && incidentAngleDeg > criticalAngle;
  const refractedAngleDeg = incidentAngleDeg === 0
    ? 0
    : totalInternal
      ? null
      : Math.asin(clamp(sin2, -1, 1)) * 180 / Math.PI;
  const refractedAngleText = refractedAngleDeg === null ? (isZh ? "无" : "none") : `${formatNumber(refractedAngleDeg)}°`;
  const directionLabel = scene === "vertical"
    ? (isZh ? "不偏折" : "No bending")
    : totalInternal
      ? (isZh ? "只反射，不折射" : "Reflects only")
      : n1 < n2
        ? (isZh ? "向法线偏折" : "Toward the normal")
        : (isZh ? "远离法线偏折" : "Away from the normal");
  const statusLabel = scene === "apparent-depth"
    ? (isZh ? "视深变化" : "Apparent depth")
    : totalInternal
      ? (isZh ? "全反射" : "Total internal reflection")
      : scene === "vertical"
        ? (isZh ? "垂直入射" : "Normal incidence")
        : (isZh ? "发生折射" : "Refraction");
  const statusTone = totalInternal ? "balanced" as const : scene === "vertical" ? "warning" as const : "active" as const;
  const summary = scene === "apparent-depth"
    ? (isZh ? `实际深度约 ${waterDepthCm} cm，视觉深度约 ${formatNumber(waterDepthCm / REFRACTIVE_INDEX.water)} cm，所以看起来更浅。` : `The real depth is about ${waterDepthCm} cm while the apparent depth is about ${formatNumber(waterDepthCm / REFRACTIVE_INDEX.water)} cm, so the fish looks shallower.`)
    : totalInternal
      ? (isZh ? `玻璃→空气时临界角约 ${formatNumber(criticalAngle ?? 0)}°，当前入射角更大，所以折射光线消失，只剩反射光线。` : `For glass to air, the critical angle is about ${formatNumber(criticalAngle ?? 0)}°. The current incident angle is larger, so the refracted ray disappears and only reflection remains.`)
      : (isZh ? `${upperMediumLabel}→${lowerMediumLabel}，当前折射角约 ${refractedAngleText}，结论是“${directionLabel}”。` : `${upperMediumLabel}→${lowerMediumLabel} gives a refracted angle of about ${refractedAngleText}, so the ray bends ${directionLabel.toLowerCase()}.`);
  const formulaCopy = scene === "apparent-depth"
    ? (isZh ? "水底射出的光在水面折射后进入空气，人眼会逆着折射光线延长线看到更浅的位置。" : "Light from the water bottom refracts into air, and the eye traces it back to a shallower apparent position.")
    : totalInternal
      ? (isZh ? `临界角公式：sin θc = n₂ / n₁，当前 θc ≈ ${formatNumber(criticalAngle ?? 0)}°。` : `Critical-angle relation: sin θc = n₂ / n₁, giving θc ≈ ${formatNumber(criticalAngle ?? 0)}° here.`)
      : (isZh ? `斯涅尔定律：n₁ sinθ₁ = n₂ sinθ₂。当前 n₁=${formatNumber(n1)}，n₂=${formatNumber(n2)}。` : `Snell's law: n₁ sinθ₁ = n₂ sinθ₂. Here n₁=${formatNumber(n1)} and n₂=${formatNumber(n2)}.`)
  ;
  const incidentLength = 180;
  const incidentRad = (incidentAngleDeg * Math.PI) / 180;
  const incidentStartX = 580 - Math.sin(incidentRad) * incidentLength;
  const incidentStartY = 384 - Math.cos(incidentRad) * incidentLength;
  const refractedLength = 194;
  const refractedRad = ((refractedAngleDeg ?? 0) * Math.PI) / 180;
  const refractedEndX = totalInternal
    ? 580
    : scene === "water-air" || scene === "total-internal"
      ? 580 - Math.sin(refractedRad) * refractedLength
      : 580 + Math.sin(refractedRad) * refractedLength;
  const refractedEndY = totalInternal
    ? 384
    : scene === "water-air" || scene === "total-internal"
      ? 384 - Math.cos(refractedRad) * refractedLength
      : 384 + Math.cos(refractedRad) * refractedLength;
  const reflectedEndX = 580 + Math.sin(incidentRad) * refractedLength;
  const reflectedEndY = 384 - Math.cos(incidentRad) * refractedLength;
  const apparentDepth = waterDepthCm / REFRACTIVE_INDEX.water;

  return {
    scene,
    statusLabel,
    statusTone,
    upperMediumLabel,
    lowerMediumLabel,
    mediumLabel: `${upperMediumLabel}→${lowerMediumLabel}`,
    directionLabel,
    refractedAngleText,
    criticalAngleText: criticalAngle === null ? "—" : `${formatNumber(criticalAngle)}°`,
    apparentDepthText: `${formatNumber(apparentDepth)} cm`,
    actualDepthText: `${waterDepthCm} cm`,
    summary,
    formulaCopy,
    recordValue: scene === "apparent-depth" ? (isZh ? `视觉深度 ${formatNumber(apparentDepth)} cm` : `Visual ${formatNumber(apparentDepth)} cm`) : (refractedAngleDeg === null ? statusLabel : `${refractedAngleText}`),
    incidentStartX,
    incidentStartY,
    refractedEndX,
    refractedEndY,
    reflectedEndX,
    reflectedEndY,
    showReflection: totalInternal,
    incidentArcX: Math.sin(incidentRad) * 24,
    incidentArcY: (1 - Math.cos(incidentRad)) * 24,
    refractedArcX: Math.sin(refractedRad) * 24,
    refractedArcY: (Math.cos(refractedRad) - 1) * 24,
    refractedArcSweep: scene === "water-air" || scene === "total-internal" ? 1 : 0,
    incidentTextX: incidentStartX + 36,
    incidentTextY: incidentStartY + 12,
    refractedTextX: totalInternal ? 632 : refractedEndX - 26,
    refractedTextY: totalInternal ? 304 : refractedEndY + (scene === "water-air" || scene === "total-internal" ? -8 : 18),
    incidentAngleDeg,
    fishActualY: 384 + waterDepthCm * 7.4,
    fishVisualY: 384 + apparentDepth * 7.4,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}
