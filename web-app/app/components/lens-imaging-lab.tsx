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

type LensImagingLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type LensPresetKey = "beyond-2f" | "at-2f" | "between-f-and-2f" | "at-f" | "inside-f";

type LensPreset = {
  key: LensPresetKey;
  stepLabel: string;
  label: string;
  summary: string;
  objectDistanceCm: number;
  focalLengthCm: number;
};

type LensRecord = {
  value: string;
  note: string;
};

const PANEL_STORAGE_KEY = "easy-teaching.lens-imaging.panel-collapsed";
const OBJECT_HEIGHT_CM = 8;
const OBJECT_DISTANCE_MIN = 6;
const OBJECT_DISTANCE_MAX = 36;
const FOCAL_LENGTH_MIN = 6;
const FOCAL_LENGTH_MAX = 14;

const PRESETS: Record<LensPresetKey, LensPreset> = {
  "beyond-2f": {
    key: "beyond-2f",
    stepLabel: "1",
    label: "u > 2f",
    summary: "物体位于 2f 外，像会落在 f 和 2f 之间，倒立且缩小。",
    objectDistanceCm: 30,
    focalLengthCm: 10,
  },
  "at-2f": {
    key: "at-2f",
    stepLabel: "2",
    label: "u = 2f",
    summary: "物体位于 2f 处时，像也位于另一侧 2f，成等大倒立实像。",
    objectDistanceCm: 20,
    focalLengthCm: 10,
  },
  "between-f-and-2f": {
    key: "between-f-and-2f",
    stepLabel: "3",
    label: "f < u < 2f",
    summary: "物体位于 f 与 2f 之间，像移到 2f 外，倒立且放大。",
    objectDistanceCm: 14,
    focalLengthCm: 8,
  },
  "at-f": {
    key: "at-f",
    stepLabel: "4",
    label: "u = f",
    summary: "物体位于焦点处，折射光线平行射出，光屏上无法承接清晰像。",
    objectDistanceCm: 10,
    focalLengthCm: 10,
  },
  "inside-f": {
    key: "inside-f",
    stepLabel: "5",
    label: "u < f",
    summary: "物体位于焦点内，像与物体位于透镜同侧，成正立放大的虚像。",
    objectDistanceCm: 8,
    focalLengthCm: 12,
  },
};

export function LensImagingLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: LensImagingLabProps) {
  const { isZh, tt } = useLocale();
  const [activePreset, setActivePreset] = useState<LensPresetKey>("beyond-2f");
  const [objectDistanceCm, setObjectDistanceCm] = useState(PRESETS["beyond-2f"].objectDistanceCm);
  const [focalLengthCm, setFocalLengthCm] = useState(PRESETS["beyond-2f"].focalLengthCm);
  const [records, setRecords] = useState<Partial<Record<LensPresetKey, LensRecord>>>({});

  const metrics = useMemo(
    () => buildLensMetrics({ objectDistanceCm, focalLengthCm, isZh }),
    [focalLengthCm, isZh, objectDistanceCm],
  );

  const stepItems = Object.values(PRESETS).map((preset) => ({
    key: preset.key,
    stepLabel: preset.stepLabel,
    label: tt(preset.label),
    active: activePreset === preset.key,
    title: tt(preset.summary),
    onClick: () => applyPreset(preset.key),
  }));

  const recordGroups: BasicForceRecordGroup[] = [
    {
      key: "lens-records",
      title: isZh ? "凸透镜成像记录单" : "Lens Imaging Worksheet",
      countLabel: `${Object.keys(records).length} / 5`,
      isActive: true,
      helper: isZh ? "建议按 2f 外、2f、f 与 2f 之间、f 处、焦内的顺序记录。" : "Record the five object-distance regions from beyond 2f to inside f.",
      conclusion:
        Object.keys(records).length < 5
          ? (isZh ? "补齐五种典型工况后，再统一归纳实像、虚像和 2f / f 临界点。" : "Complete the five typical regions before summarizing real vs. virtual images and the critical points at f and 2f.")
          : (isZh ? "归纳：u>f 时成倒立实像，u=f 不成像，u<f 时成正立放大虚像；物体从 2f 外向焦点移动时，像逐渐远离透镜并变大。" : "Summary: u>f gives an inverted real image, u=f forms no screen image, and u<f gives an upright enlarged virtual image. As the object moves from beyond 2f toward f, the image moves away and enlarges."),
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
              note: isZh ? "先观察光路和像的位置，再记录结果。" : "Observe the rays and image position first, then record the result.",
              isPending: true,
            };
      }),
    },
  ];

  function applyPreset(key: LensPresetKey) {
    const preset = PRESETS[key];
    setActivePreset(key);
    setObjectDistanceCm(preset.objectDistanceCm);
    setFocalLengthCm(preset.focalLengthCm);
  }

  function recordCurrentScene() {
    setRecords((previous) => ({
      ...previous,
      [activePreset]: {
        value: metrics.valueLabel,
        note: metrics.summary,
      },
    }));
  }

  function resetLab() {
    setRecords({});
    applyPreset("beyond-2f");
  }

  return (
    <TeachingLabShell
      panelStorageKey={PANEL_STORAGE_KEY}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      fullscreenRef={fullscreenRef}
      controlTitle={isZh ? "参数控制" : "Control Panel"}
      controlCopy={isZh ? "围绕物距 u 和焦距 f，观察实像、虚像以及 2f / f 的临界变化。" : "Change object distance u and focal length f to observe real images, virtual images, and the critical points at 2f and f."}
      statusItems={[
        <StatusPill key="topic" tone="active">{isZh ? "凸透镜成像" : "Convex Lens Imaging"}</StatusPill>,
        <StatusPill key="status" tone={metrics.statusTone}>{metrics.statusLabel}</StatusPill>,
      ]}
      rootClassName="lens-lab-shell"
      panelClassName="lens-control-panel"
      mainClassName="lens-lab-main"
      controlContent={
        <>
          <ControlPanelSection
            title={isZh ? "课堂步骤" : "Class Steps"}
            hint={isZh ? "五个典型区间就是课堂主线" : "These five regions are the classroom backbone"}
            accent
          >
            <ControlStepGroup items={stepItems} className="control-step-group is-panel" />
            <p className="force-inline-copy">{tt(PRESETS[activePreset].summary)}</p>
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "核心参数" : "Core Parameters"}
            hint={isZh ? "调 u 和 f，就能穿过所有典型工况" : "Changing u and f covers all the typical cases"}
          >
            <ControlRange
              id="lens-object-distance"
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
              id="lens-focal-length"
              label={isZh ? "焦距 f" : "Focal length f"}
              min={FOCAL_LENGTH_MIN}
              max={FOCAL_LENGTH_MAX}
              step={0.5}
              unit="cm"
              editable
              value={focalLengthCm}
              onChange={setFocalLengthCm}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "操作与记录" : "Observe & Record"}
            hint={isZh ? "先看像的位置和正倒，再记录本组" : "Observe position and orientation before recording"}
          >
            <div className="force-action-grid">
              <ControlButton variant="primary" onClick={recordCurrentScene}>
                {isZh ? "记录本组" : "Record This Run"}
              </ControlButton>
              <ControlButton variant="ghost" onClick={() => applyPreset(activePreset)}>
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
              emptyCopy={isZh ? "建议先按 2f 外、2f、f 与 2f 之间三组实像规律，再看 f 处与焦内虚像。" : "Start with the three real-image regions, then move to the focus point and the inside-f virtual-image case."}
              pendingCopy={isZh ? "待测" : "Pending"}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "思考提示" : "Think Prompt"}
            hint={isZh ? "围绕焦点、实像、虚像和实际应用" : "Connect focus, real/virtual images, and applications"}
          >
            <ul className="force-support-question-list">
              <li>{isZh ? "为什么照相机通常把物体放在 2f 外？" : "Why does a camera usually keep the object beyond 2f?"}</li>
              <li>{isZh ? "为什么放大镜要把物体放在焦点以内？" : "Why must a magnifier place the object inside the focal length?"}</li>
              <li>{isZh ? "透镜遮住一半时，像会缺一半还是只会变暗？" : "If half of the lens is blocked, does half of the image disappear or just become dimmer?"}</li>
            </ul>
          </ControlPanelSection>
        </>
      }
      stageContent={
        <div className="visual-canvas force-stage-canvas lens-stage-canvas teaching-overlay-stage-canvas is-2d-mode">
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
              <p className="pressure-stage-copy">{tt(PRESETS[activePreset].summary)}</p>
              <div className="force-stage-chip-grid">
                <span className="force-stage-chip">{metrics.orientationLabel}</span>
                <span className="force-stage-chip">{metrics.kindLabel}</span>
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
                  <strong>{`${formatNumber(objectDistanceCm)} cm`}</strong>
                  <span>{isZh ? "物距 u" : "Object distance"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{`${formatNumber(focalLengthCm)} cm`}</strong>
                  <span>{isZh ? "焦距 f" : "Focal length"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{metrics.imageDistanceText}</strong>
                  <span>{isZh ? "像距 v" : "Image distance"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{metrics.imageHeightText}</strong>
                  <span>{isZh ? "像高 h" : "Image height"}</span>
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
                  <span>{isZh ? "当前工况" : "Current case"}</span>
                  <strong>{tt(PRESETS[activePreset].label)}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "像的性质" : "Image type"}</span>
                  <strong>{metrics.kindLabel}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "放大率" : "Magnification"}</span>
                  <strong>{metrics.magnificationText}</strong>
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
            className="force-stage-svg lens-stage-svg"
            role="img"
            aria-label={isZh ? `${topic.title}可视化示意图` : `${topic.title} visualization`}
          >
            <defs>
              <linearGradient id="lens-body-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(129, 214, 255, 0.22)" />
                <stop offset="50%" stopColor="rgba(96, 165, 250, 0.9)" />
                <stop offset="100%" stopColor="rgba(129, 214, 255, 0.22)" />
              </linearGradient>
              <linearGradient id="lens-object-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>

            <rect x="74" y="88" width="1012" height="560" rx="36" className="motion-stage-panel-shell" />
            <text x="110" y="126" className="motion-stage-panel-title">{isZh ? "凸透镜成像实验台" : "Convex Lens Imaging Bench"}</text>
            <text x="110" y="152" className="motion-stage-panel-copy">
              {isZh ? "围绕 f、2f 和物体位置的变化，观察像的位置、大小、正倒和虚实。" : "Use f, 2f, and the object position to track image position, size, orientation, and whether it is real or virtual."}
            </text>

            <line x1="120" y1="386" x2="1036" y2="386" className="pinhole-stage-axis" />
            <text x="126" y="370" className="motion-stage-ruler-label">{isZh ? "主光轴" : "Axis"}</text>

            <line x1="580" y1="194" x2="580" y2="544" className="lens-stage-lens-center-line" />
            <path d="M 580 194 C 542 248, 542 490, 580 544 C 618 490, 618 248, 580 194 Z" fill="url(#lens-body-gradient)" className="lens-stage-lens-body" />
            <text x="580" y="574" textAnchor="middle" className="motion-stage-ruler-label">{isZh ? "凸透镜" : "Lens"}</text>

            <line x1={metrics.objectX} y1="516" x2={metrics.objectX} y2={metrics.objectTopY} className="pinhole-stage-object-arrow" />
            <path d={`M ${metrics.objectX} ${metrics.objectTopY} L ${metrics.objectX - 16} ${metrics.objectTopY + 24} M ${metrics.objectX} ${metrics.objectTopY} L ${metrics.objectX + 16} ${metrics.objectTopY + 24}`} className="pinhole-stage-object-arrow" />
            <text x={metrics.objectX} y="548" textAnchor="middle" className="motion-stage-ruler-label">{isZh ? "物体" : "Object"}</text>

            <line x1={metrics.leftFocusX} y1="374" x2={metrics.leftFocusX} y2="398" className="pressure-stage-measure-cap" />
            <line x1={metrics.rightFocusX} y1="374" x2={metrics.rightFocusX} y2="398" className="pressure-stage-measure-cap" />
            <line x1={metrics.leftTwoFocusX} y1="374" x2={metrics.leftTwoFocusX} y2="398" className="pressure-stage-measure-cap" />
            <line x1={metrics.rightTwoFocusX} y1="374" x2={metrics.rightTwoFocusX} y2="398" className="pressure-stage-measure-cap" />
            <text x={metrics.leftFocusX} y="426" textAnchor="middle" className="motion-stage-ruler-label">F</text>
            <text x={metrics.rightFocusX} y="426" textAnchor="middle" className="motion-stage-ruler-label">F</text>
            <text x={metrics.leftTwoFocusX} y="426" textAnchor="middle" className="motion-stage-ruler-label">2F</text>
            <text x={metrics.rightTwoFocusX} y="426" textAnchor="middle" className="motion-stage-ruler-label">2F</text>

            <line x1={metrics.objectX} y1={metrics.objectTopY} x2="580" y2={metrics.objectTopY} className="lens-stage-ray is-parallel" />
            <line x1="580" y1={metrics.objectTopY} x2={metrics.rayParallelEndX} y2={metrics.rayParallelEndY} className="lens-stage-ray is-parallel" />
            <line x1={metrics.objectX} y1={metrics.objectTopY} x2={metrics.imageAnchorX} y2={metrics.imageAnchorY} className="lens-stage-ray is-center" />
            <line x1={metrics.objectX} y1={metrics.objectTopY} x2="580" y2="386" className="lens-stage-ray is-focus" />
            <line x1="580" y1="386" x2={metrics.rayFocusEndX} y2={metrics.rayFocusEndY} className="lens-stage-ray is-focus" />

            {metrics.isVirtual ? (
              <>
                <line x1="580" y1={metrics.objectTopY} x2={metrics.virtualGuideX} y2={metrics.virtualGuideY} className="lens-stage-ray is-dashed" />
                <line x1="580" y1="386" x2={metrics.virtualGuideX} y2={metrics.virtualGuideY} className="lens-stage-ray is-dashed" />
              </>
            ) : null}

            {metrics.hasScreenImage ? (
              <>
                <rect x={metrics.imageX - 12} y="210" width="24" height="312" rx="12" className="pinhole-stage-screen" />
                <line x1={metrics.imageX} y1="516" x2={metrics.imageX} y2={metrics.imageTopY} className="lens-stage-image-arrow" />
                <path
                  d={`M ${metrics.imageX} ${metrics.imageTopY} L ${metrics.imageX - 16} ${metrics.imageTopY + (metrics.isVirtual ? -24 : 24)} M ${metrics.imageX} ${metrics.imageTopY} L ${metrics.imageX + 16} ${metrics.imageTopY + (metrics.isVirtual ? -24 : 24)}`}
                  className="lens-stage-image-arrow"
                />
                <text x={metrics.imageX} y="548" textAnchor="middle" className="motion-stage-ruler-label">{isZh ? "光屏 / 像" : "Screen / Image"}</text>
              </>
            ) : (
              <text x="830" y="284" textAnchor="middle" className="force-svg-copy">
                {isZh ? "u = f：光线平行射出，光屏无法承接清晰像" : "u = f: rays emerge parallel, so no clear screen image forms"}
              </text>
            )}

            {metrics.isVirtual ? (
              <>
                <line x1={metrics.imageX} y1="516" x2={metrics.imageX} y2={metrics.imageTopY} className="lens-stage-virtual-image" />
                <path d={`M ${metrics.imageX} ${metrics.imageTopY} L ${metrics.imageX - 16} ${metrics.imageTopY - 24} M ${metrics.imageX} ${metrics.imageTopY} L ${metrics.imageX + 16} ${metrics.imageTopY - 24}`} className="lens-stage-virtual-image" />
                <text x={metrics.imageX} y="548" textAnchor="middle" className="motion-stage-ruler-label">{isZh ? "虚像" : "Virtual Image"}</text>
              </>
            ) : null}
          </svg>
        </div>
      }
    />
  );
}

function buildLensMetrics({
  objectDistanceCm,
  focalLengthCm,
  isZh,
}: {
  objectDistanceCm: number;
  focalLengthCm: number;
  isZh: boolean;
}) {
  const epsilon = 0.25;
  const lensX = 580;
  const leftFocusX = lensX - focalLengthCm * 12;
  const rightFocusX = lensX + focalLengthCm * 12;
  const leftTwoFocusX = lensX - focalLengthCm * 24;
  const rightTwoFocusX = lensX + focalLengthCm * 24;
  const objectX = lensX - objectDistanceCm * 12;
  const objectHeightVisual = OBJECT_HEIGHT_CM * 18;
  const objectTopY = 516 - objectHeightVisual;
  const nearFocus = Math.abs(objectDistanceCm - focalLengthCm) <= epsilon;
  const isVirtual = objectDistanceCm < focalLengthCm - epsilon;
  const hasScreenImage = !nearFocus && !isVirtual;
  const imageDistanceCm = nearFocus
    ? null
    : Number((1 / (1 / focalLengthCm - 1 / objectDistanceCm)).toFixed(2));
  const magnification = nearFocus || imageDistanceCm === null ? null : Math.abs(imageDistanceCm / objectDistanceCm);
  const imageHeightCm = magnification === null ? null : Number((OBJECT_HEIGHT_CM * magnification).toFixed(2));
  const imageX = imageDistanceCm === null
    ? lensX + 240
    : isVirtual
      ? lensX - clamp(imageDistanceCm, 4, 22) * 12
      : lensX + clamp(imageDistanceCm, 4, 28) * 12;
  const imageHeightVisual = imageHeightCm === null ? 0 : imageHeightCm * 18;
  const imageTopY = nearFocus ? 0 : isVirtual ? 516 - imageHeightVisual : 516 - imageHeightVisual;
  const statusLabel = nearFocus ? (isZh ? "焦点处" : "At focus") : isVirtual ? (isZh ? "焦内虚像" : "Virtual image") : (isZh ? "实像区域" : "Real image");
  const statusTone = nearFocus ? "warning" as const : isVirtual ? "balanced" as const : "active" as const;
  const orientationLabel = nearFocus ? (isZh ? "像不存在" : "No image") : isVirtual ? (isZh ? "正立" : "Upright") : (isZh ? "倒立" : "Inverted");
  const kindLabel = nearFocus ? (isZh ? "不成像" : "No screen image") : isVirtual ? (isZh ? "放大虚像" : "Enlarged virtual image") : (imageHeightCm !== null && imageHeightCm > OBJECT_HEIGHT_CM ? (isZh ? "放大实像" : "Enlarged real image") : imageHeightCm !== null && Math.abs(imageHeightCm - OBJECT_HEIGHT_CM) < 0.5 ? (isZh ? "等大实像" : "Same-size real image") : (isZh ? "缩小实像" : "Reduced real image"));
  const formulaCopy = nearFocus
    ? (isZh ? "当 u = f 时，透过透镜的主光线会平行射出，所以光屏上找不到清晰像。" : "When u = f, the key rays emerge parallel, so no sharp image can be caught on a screen.")
    : (isZh ? `薄透镜公式：1/u + 1/v = 1/f，当前 v ≈ ${formatNumber(imageDistanceCm ?? 0)} cm。` : `Thin-lens equation: 1/u + 1/v = 1/f, so v is about ${formatNumber(imageDistanceCm ?? 0)} cm.`);
  const summary = nearFocus
    ? (isZh ? "物体位于焦点处，成像退化为平行光，光屏无法承接。" : "The object is at the focus, so the image degenerates into parallel light and the screen cannot catch it.")
    : isVirtual
      ? (isZh ? `物体位于焦点内，像在透镜同侧，成正立放大虚像，放大率约 ${formatNumber(magnification ?? 1)}。` : `The object lies inside the focus, so the image appears on the same side as an upright enlarged virtual image with magnification ${formatNumber(magnification ?? 1)}.`)
      : (isZh ? `当前成${kindLabel}，像距约 ${formatNumber(imageDistanceCm ?? 0)} cm，像高约 ${formatNumber(imageHeightCm ?? 0)} cm。` : `This setup gives a ${kindLabel.toLowerCase()} with image distance ${formatNumber(imageDistanceCm ?? 0)} cm and image height ${formatNumber(imageHeightCm ?? 0)} cm.`);
  const valueLabel = nearFocus
    ? (isZh ? "不成像" : "No image")
    : `${isZh ? "v≈" : "v≈"}${formatNumber(imageDistanceCm ?? 0)} cm`;

  return {
    nearFocus,
    isVirtual,
    hasScreenImage,
    imageDistanceCm,
    imageHeightCm,
    imageDistanceText: nearFocus ? (isZh ? "∞" : "∞") : `${formatNumber(imageDistanceCm ?? 0)} cm`,
    imageHeightText: nearFocus ? "—" : `${formatNumber(imageHeightCm ?? 0)} cm`,
    magnificationText: nearFocus ? "—" : `${formatNumber(magnification ?? 0)}`,
    statusLabel,
    statusTone,
    orientationLabel,
    kindLabel,
    formulaCopy,
    summary,
    valueLabel,
    objectX,
    objectTopY,
    leftFocusX,
    rightFocusX,
    leftTwoFocusX,
    rightTwoFocusX,
    imageX,
    imageTopY,
    imageAnchorX: isVirtual ? imageX : imageX,
    imageAnchorY: imageTopY,
    rayParallelEndX: isVirtual ? 980 : imageX,
    rayParallelEndY: isVirtual ? 266 : imageTopY,
    rayFocusEndX: isVirtual ? 980 : imageX,
    rayFocusEndY: isVirtual ? objectTopY : imageTopY,
    virtualGuideX: imageX,
    virtualGuideY: imageTopY,
  };
}

function formatNumber(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
