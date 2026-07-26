import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import type { TeachingTopic } from "../data/teaching-catalog";
import { useLocale } from "../i18n";
import { FullscreenToggleButton } from "./fullscreen-toggle-button";
import { BasicForceRecordTable } from "./basic-force-record-table";
import { ControlButton } from "./control-button";
import { ControlChipGroup } from "./control-chip-group";
import { ControlPanelSection } from "./control-panel-section";
import { ControlRange } from "./control-range";
import { ControlStatusBar } from "./control-status-bar";
import { ControlStepGroup } from "./control-step-group";
import { StatusPill } from "./status-pill";

type ShadowFormationLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type ShadowStepKey =
  | "point-shadow"
  | "area-shadow"
  | "object-near-source"
  | "screen-near-object";
type SourceType = "point" | "area";
type ObservationState = "idle" | "observing" | "stable";
type TimerId = ReturnType<typeof setInterval>;

type ShadowStepPreset = {
  key: ShadowStepKey;
  stepLabel: string;
  label: string;
  summary: string;
  focus: string;
  sourceType: SourceType;
  objectDistanceCm: number;
  screenDistanceCm: number;
  sourceSizeCm: number;
  showRays: boolean;
};

type ShadowRecord = {
  key: ShadowStepKey;
  value: string;
  note: string;
};

type ShadowScene = {
  sourceX: number;
  sourceCenterY: number;
  sourceTopY: number;
  sourceBottomY: number;
  objectLeftX: number;
  objectRightX: number;
  objectTopY: number;
  objectBottomY: number;
  screenX: number;
  screenTopY: number;
  screenBottomY: number;
  pointShadowTopY: number;
  pointShadowBottomY: number;
  outerShadowTopY: number;
  outerShadowBottomY: number;
  umbraTopY: number;
  umbraBottomY: number;
  shadowHeightCm: number;
  umbraHeightCm: number;
  penumbraHeightCm: number;
};

const PANEL_COLLAPSED_STORAGE_KEY = "easy-teaching.shadow-formation.panel-collapsed";
const OBSERVATION_TICK_MS = 40;
const OBSERVATION_DURATION_MS = 960;
const OBJECT_DISTANCE_MIN = 12;
const OBJECT_DISTANCE_MAX = 24;
const SCREEN_DISTANCE_MIN = 12;
const SCREEN_DISTANCE_MAX = 24;
const SOURCE_SIZE_MIN = 4;
const SOURCE_SIZE_MAX = 14;
const STEP_SEQUENCE: ShadowStepKey[] = [
  "point-shadow",
  "area-shadow",
  "object-near-source",
  "screen-near-object",
];

const STEP_PRESETS: Record<ShadowStepKey, ShadowStepPreset> = {
  "point-shadow": {
    key: "point-shadow",
    stepLabel: "1",
    label: "点光源影子",
    summary: "先用点光源照射不透明物体，观察屏上影子边界清晰。",
    focus: "点光源可以近似看成一个发光点，被遮挡后屏上得到边界清晰的影子。",
    sourceType: "point",
    objectDistanceCm: 18,
    screenDistanceCm: 18,
    sourceSizeCm: 4,
    showRays: true,
  },
  "area-shadow": {
    key: "area-shadow",
    stepLabel: "2",
    label: "本影与半影",
    summary: "切换到面光源，观察屏中央的本影和边缘的半影。",
    focus: "面光源的不同部分会分别被遮挡，因此会同时出现本影和半影。",
    sourceType: "area",
    objectDistanceCm: 18,
    screenDistanceCm: 18,
    sourceSizeCm: 10,
    showRays: true,
  },
  "object-near-source": {
    key: "object-near-source",
    stepLabel: "3",
    label: "物体靠近光源",
    summary: "把物体向光源移动，观察光屏上的影子变大。",
    focus: "物体越靠近光源，遮挡光线的张角越大，屏上的影子也越大。",
    sourceType: "point",
    objectDistanceCm: 14,
    screenDistanceCm: 20,
    sourceSizeCm: 4,
    showRays: true,
  },
  "screen-near-object": {
    key: "screen-near-object",
    stepLabel: "4",
    label: "光屏靠近物体",
    summary: "把光屏向物体靠近，观察影子缩小，半影范围收窄。",
    focus: "光屏越靠近物体，投影越小；面光源下半影也会随之收窄。",
    sourceType: "area",
    objectDistanceCm: 18,
    screenDistanceCm: 12,
    sourceSizeCm: 10,
    showRays: true,
  },
};

const SVG_STAGE = {
  width: 1160,
  height: 760,
  panelX: 56,
  panelY: 86,
  panelWidth: 1048,
  panelHeight: 572,
  sourceX: 178,
  sourceCenterY: 348,
  objectBaseY: 506,
  objectHeight: 154,
  objectWidth: 56,
  screenTopY: 188,
  screenBottomY: 610,
  benchY: 548,
  objectScaleX: 11.2,
  screenScaleX: 10.4,
  shadowScaleCmPerPx: 0.12,
};

export function ShadowFormationLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: ShadowFormationLabProps) {
  const { isZh, tt } = useLocale();
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  const [activeStep, setActiveStep] = useState<ShadowStepKey>("point-shadow");
  const [sourceType, setSourceType] = useState<SourceType>(STEP_PRESETS["point-shadow"].sourceType);
  const [objectDistanceCm, setObjectDistanceCm] = useState(STEP_PRESETS["point-shadow"].objectDistanceCm);
  const [screenDistanceCm, setScreenDistanceCm] = useState(STEP_PRESETS["point-shadow"].screenDistanceCm);
  const [sourceSizeCm, setSourceSizeCm] = useState(STEP_PRESETS["point-shadow"].sourceSizeCm);
  const [showRays, setShowRays] = useState(STEP_PRESETS["point-shadow"].showRays);
  const [observationState, setObservationState] = useState<ObservationState>("idle");
  const [progress, setProgress] = useState(0);
  const [records, setRecords] = useState<Partial<Record<ShadowStepKey, ShadowRecord>>>({});
  const timerRef = useRef<TimerId | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsControlPanelCollapsed(
      window.localStorage.getItem(PANEL_COLLAPSED_STORAGE_KEY) === "1",
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      PANEL_COLLAPSED_STORAGE_KEY,
      isControlPanelCollapsed ? "1" : "0",
    );
  }, [isControlPanelCollapsed]);

  useEffect(() => {
    return () => {
      clearObservationTimer(timerRef.current);
    };
  }, []);

  const activePreset = STEP_PRESETS[activeStep];
  const recordedCount = STEP_SEQUENCE.filter((key) => records[key]).length;
  const isRecordEnabled = observationState === "stable";
  const scene = useMemo(
    () =>
      buildShadowScene({
        sourceType,
        objectDistanceCm,
        screenDistanceCm,
        sourceSizeCm,
      }),
    [objectDistanceCm, screenDistanceCm, sourceSizeCm, sourceType],
  );

  const stageMeta = useMemo(() => {
    const copy = describeObservation({ step: activeStep, sourceType, scene, isZh });

    if (observationState === "stable") {
      return {
        label: isZh ? "现象稳定" : "Stable observation",
        tone: "balanced" as const,
        copy,
      };
    }

    if (observationState === "observing") {
      return {
        label: isZh ? "观察中" : "Observing",
        tone: "active" as const,
        copy,
      };
    }

    return {
      label: isZh ? "待观察" : "Ready",
      tone: "warning" as const,
      copy: activePreset.summary,
    };
  }, [activePreset.summary, activeStep, isZh, observationState, scene, sourceType]);

  const stepItems = STEP_SEQUENCE.map((key) => {
    const preset = STEP_PRESETS[key];
    return {
      key,
      stepLabel: preset.stepLabel,
      label: tt(preset.label),
      active: activeStep === key,
      title: tt(preset.summary),
      onClick: () => applyPreset(key),
    };
  });

  const summaryItems = [
    {
      label: isZh ? "当前光源" : "Current source",
      value: sourceType === "point" ? tt("点光源") : tt("面光源"),
    },
    {
      label: isZh ? "课堂结论" : "Current takeaway",
      value: tt(activePreset.focus),
    },
  ];

  const recordGroups = [
    {
      key: "shadow",
      title: isZh ? "四组课堂验证" : "Four classroom checks",
      countLabel: isZh ? `${recordedCount} / 4 组` : `${recordedCount} / 4 runs`,
      isActive: true,
      helper: isZh
        ? "按“点光源 -> 面光源 -> 物体靠近光源 -> 光屏靠近物体”依次观察，最后再统一归纳影子形成规律。"
        : "Observe point source, area source, object closer, then screen closer.",
      rows: STEP_SEQUENCE.map((key) => {
        const preset = STEP_PRESETS[key];
        const record = records[key];

        return {
          key,
          label: tt(preset.label),
          value: record?.value ?? "",
          note: record?.note ?? tt(preset.focus),
          isPending: !record,
          isCurrent: activeStep === key,
        };
      }),
      conclusion:
        recordedCount === STEP_SEQUENCE.length
          ? (isZh
            ? "课堂结论：光在同种均匀介质中沿直线传播；点光源形成边界清晰的影子，面光源会形成本影和半影，影子大小会随物体与光屏位置变化。"
            : "Conclusion: light travels in straight lines within a uniform medium; point sources create crisp shadows, while area sources create umbra and penumbra.")
          : undefined,
    },
  ];

  const primaryActionLabel = observationState === "observing"
    ? (isZh ? "观察中…" : "Observing…")
    : (isZh ? "开始观察" : "Start observing");
  const recordButtonLabel = currentStepRecorded(records, activeStep)
    ? (isZh ? "更新本组" : "Update run")
    : (isZh ? "记录本组" : "Record run");

  function applyPreset(step: ShadowStepKey) {
    const preset = STEP_PRESETS[step];
    clearObservationTimer(timerRef.current);
    setActiveStep(step);
    setSourceType(preset.sourceType);
    setObjectDistanceCm(preset.objectDistanceCm);
    setScreenDistanceCm(preset.screenDistanceCm);
    setSourceSizeCm(preset.sourceSizeCm);
    setShowRays(preset.showRays);
    setObservationState("idle");
    setProgress(0);
  }

  function invalidateObservation() {
    clearObservationTimer(timerRef.current);
    setObservationState("idle");
    setProgress(0);
  }

  function startObservation() {
    clearObservationTimer(timerRef.current);
    setObservationState("observing");
    setProgress(0);

    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const ratio = Math.min(1, (Date.now() - startedAt) / OBSERVATION_DURATION_MS);
      setProgress(ratio);

      if (ratio >= 1) {
        clearObservationTimer(timerRef.current);
        setObservationState("stable");
      }
    }, OBSERVATION_TICK_MS);
  }

  function recordCurrentObservation() {
    if (!isRecordEnabled) {
      return;
    }

    const nextRecord: ShadowRecord = {
      key: activeStep,
      value: buildRecordValue({ step: activeStep, sourceType, scene, isZh }),
      note: tt(activePreset.focus),
    };
    const nextRecords = {
      ...records,
      [activeStep]: nextRecord,
    };

    setRecords(nextRecords);
    clearObservationTimer(timerRef.current);
    setObservationState("idle");
    setProgress(0);

    const nextStep = findNextPendingStep(nextRecords);
    if (nextStep) {
      const preset = STEP_PRESETS[nextStep];
      setActiveStep(nextStep);
      setSourceType(preset.sourceType);
      setObjectDistanceCm(preset.objectDistanceCm);
      setScreenDistanceCm(preset.screenDistanceCm);
      setSourceSizeCm(preset.sourceSizeCm);
      setShowRays(preset.showRays);
    }
  }

  function resetLab() {
    setRecords({});
    applyPreset("point-shadow");
  }

  const shadowHeightText = `${formatMeasure(scene.shadowHeightCm)} cm`;
  const umbraHeightText = scene.umbraHeightCm > 0
    ? `${formatMeasure(scene.umbraHeightCm)} cm`
    : (isZh ? "无" : "None");
  const penumbraHeightText = scene.penumbraHeightCm > 0
    ? `${formatMeasure(scene.penumbraHeightCm)} cm`
    : (isZh ? "无" : "None");

  return (
    <section ref={fullscreenRef} className="visual-shell force-lab-shell shadow-lab-shell">
      <div
        className={
          isControlPanelCollapsed
            ? "force-lab-layout shadow-lab-layout is-collapsed"
            : "force-lab-layout shadow-lab-layout"
        }
      >
        <aside
          className={
            isControlPanelCollapsed
              ? "force-control-panel shadow-control-panel is-collapsed"
              : "force-control-panel shadow-control-panel"
          }
        >
          {isControlPanelCollapsed ? (
            <div className="force-panel-collapsed-shell">
              <button
                type="button"
                className="force-panel-toggle is-collapsed-only"
                onClick={() => setIsControlPanelCollapsed(false)}
                aria-label={tt("展开控制面板")}
                title={tt("展开控制面板")}
              >
                <PanelChevronIcon collapsed />
              </button>
            </div>
          ) : (
            <>
              <div className="force-control-header">
                <div className="force-control-title-block">
                  <h4 className="force-control-title">{tt("参数控制")}</h4>
                </div>
                <button
                  type="button"
                  className="force-panel-toggle"
                  onClick={() => setIsControlPanelCollapsed(true)}
                  aria-label={tt("收起控制面板")}
                  title={tt("收起控制面板")}
                >
                  <PanelChevronIcon collapsed={false} />
                </button>
              </div>

              <div className="force-control-scroll shadow-control-scroll">
                <ControlPanelSection
                  title={isZh ? "课堂主流程" : "Classroom Flow"}
                  hint={isZh ? "先看点光源，再看本影半影和位置变化" : "Point source first, then penumbra and distance changes"}
                  accent
                >
                  <ControlStatusBar
                    items={[
                      <StatusPill key="step">{tt(activePreset.label)}</StatusPill>,
                      <StatusPill key="record">{isZh ? `${recordedCount} / 4 已记录` : `${recordedCount} / 4 recorded`}</StatusPill>,
                    ]}
                    status={<StatusPill tone={stageMeta.tone}>{stageMeta.label}</StatusPill>}
                  />
                  <p className="force-inline-copy">{tt(activePreset.summary)}</p>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "位置参数" : "Scene Distances"}
                  hint={isZh ? "控制物体与光源、光屏与物体的相对位置" : "Control how far the object and screen are from the source"}
                >
                  <ControlRange
                    id="shadow-object-distance"
                    label={isZh ? "物体距光源" : "Object from source"}
                    min={OBJECT_DISTANCE_MIN}
                    max={OBJECT_DISTANCE_MAX}
                    step={0.5}
                    unit="cm"
                    value={objectDistanceCm}
                    editable
                    onChange={(value) => {
                      setObjectDistanceCm(value);
                      invalidateObservation();
                    }}
                  />

                  <ControlRange
                    id="shadow-screen-distance"
                    label={isZh ? "光屏距物体" : "Screen from object"}
                    min={SCREEN_DISTANCE_MIN}
                    max={SCREEN_DISTANCE_MAX}
                    step={0.5}
                    unit="cm"
                    value={screenDistanceCm}
                    editable
                    onChange={(value) => {
                      setScreenDistanceCm(value);
                      invalidateObservation();
                    }}
                  />

                  <div className="pressure-inline-lock-grid">
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "影子高度" : "Shadow height"}</span>
                      <strong className="force-insight-value">{shadowHeightText}</strong>
                    </article>
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "本影高度" : "Umbra height"}</span>
                      <strong className="force-insight-value">{umbraHeightText}</strong>
                    </article>
                  </div>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "光源设置" : "Light Source"}
                  hint={isZh ? "点光源边界清晰，面光源会出现本影与半影" : "Point sources are crisp; area sources create penumbra"}
                >
                  <ControlChipGroup
                    items={[
                      {
                        key: "point",
                        label: tt("点光源"),
                        active: sourceType === "point",
                        onClick: () => {
                          setSourceType("point");
                          invalidateObservation();
                        },
                      },
                      {
                        key: "area",
                        label: tt("面光源"),
                        active: sourceType === "area",
                        onClick: () => {
                          setSourceType("area");
                          invalidateObservation();
                        },
                      },
                    ]}
                    columns={2}
                    size="dense"
                  />

                  <ControlRange
                    id="shadow-source-size"
                    label={isZh ? "发光面高度" : "Source height"}
                    min={SOURCE_SIZE_MIN}
                    max={SOURCE_SIZE_MAX}
                    step={0.5}
                    unit="cm"
                    value={sourceSizeCm}
                    editable
                    disabled={sourceType !== "area"}
                    onChange={(value) => {
                      setSourceSizeCm(value);
                      invalidateObservation();
                    }}
                  />

                  <ControlChipGroup
                    items={[
                      {
                        key: "show-rays",
                        label: tt("显示光线"),
                        active: showRays,
                        onClick: () => setShowRays((previous) => !previous),
                      },
                    ]}
                    columns={1}
                    size="dense"
                  />
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "操作与记录" : "Observe & Record"}
                  hint={isZh ? "观察稳定后再记录本组" : "Record only after the scene settles"}
                >
                  <div className="force-action-grid">
                    <ControlButton
                      variant="primary"
                      disabled={observationState === "observing"}
                      onClick={startObservation}
                    >
                      {primaryActionLabel}
                    </ControlButton>
                    <ControlButton
                      variant="ghost"
                      disabled={!isRecordEnabled}
                      onClick={recordCurrentObservation}
                    >
                      {recordButtonLabel}
                    </ControlButton>
                    <ControlButton variant="ghost" onClick={resetLab}>
                      {tt("重置")}
                    </ControlButton>
                  </div>

                  <p className="force-inline-copy">{tt(stageMeta.copy)}</p>

                  <BasicForceRecordTable
                    groups={recordGroups}
                    emptyTitle={isZh ? "先完成第一组观察" : "Finish the first observation"}
                    emptyCopy={
                      isZh
                        ? "记录单会保留点光源、面光源和两组位置变化观察，最后统一归纳影子形成规律。"
                        : "The worksheet keeps the source and distance comparisons for the final conclusion."
                    }
                    pendingCopy={isZh ? "待测" : "Pending"}
                  />
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "思考提示" : "Think Prompt"}
                  hint={isZh ? "帮助课堂讲清本影、半影和影子大小变化" : "Support the class explanation of umbra and penumbra"}
                >
                  <ul className="force-support-question-list">
                    <li>{isZh ? "为什么点光源形成的影子边界更清晰？" : "Why is the point-source shadow sharper?"}</li>
                    <li>{isZh ? "面光源为什么会同时出现本影和半影？" : "Why does an area source create both umbra and penumbra?"}</li>
                    <li>{isZh ? "物体靠近光源或光屏靠近物体时，影子为什么会变化？" : "Why does the shadow change when the object or screen moves?"}</li>
                  </ul>
                </ControlPanelSection>
              </div>
            </>
          )}
        </aside>

        <div className="force-lab-main shadow-lab-main">
          <div className="force-toolbar">
            <div className="force-toolbar-status">
              <StatusPill tone="active">{tt("光的直线传播")}</StatusPill>
              <StatusPill tone={stageMeta.tone}>{stageMeta.label}</StatusPill>
            </div>
            <div className="force-toolbar-actions">
              <FullscreenToggleButton
                isFullscreen={isFullscreen}
                onToggle={onToggleFullscreen}
                variant="compact"
              />
            </div>
          </div>

          <div className="visual-canvas force-stage-canvas shadow-stage-canvas is-2d-mode">
            <ControlStepGroup
              className="force-stage-overlay is-top-center force-stage-stepbar shadow-stage-stepbar"
              items={stepItems}
            />
            <div className="visual-glow visual-glow-a" />
            <div className="visual-glow visual-glow-b" />

            <div className="force-stage-overlay is-top-left">
              <div className="force-stage-hud-card">
                <div className="force-stage-hud-head">
                  <span className="force-stage-hud-title">{tt("当前验证重点")}</span>
                  <StatusPill tone={stageMeta.tone}>{stageMeta.label}</StatusPill>
                </div>
                <p className="pressure-stage-copy">{tt(activePreset.focus)}</p>
                <div className="force-stage-progress-inline">
                  <span style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }} />
                </div>
                <div className="force-stage-chip-grid">
                  <span className="force-stage-chip">
                    {sourceType === "point" ? tt("点光源") : tt("面光源")}
                  </span>
                  <span className="force-stage-chip">
                    {sourceType === "point" ? tt("边界清晰") : tt("本影 + 半影")}
                  </span>
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
                    <strong>{formatMeasure(objectDistanceCm)} cm</strong>
                    <span>{isZh ? "物体距光源" : "Object-source"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{formatMeasure(screenDistanceCm)} cm</strong>
                    <span>{isZh ? "光屏距物体" : "Screen-object"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{shadowHeightText}</strong>
                    <span>{isZh ? "影子高度" : "Shadow height"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{sourceType === "area" ? penumbraHeightText : tt("无")}</strong>
                    <span>{isZh ? "半影范围" : "Penumbra"}</span>
                  </article>
                </div>
                <p className="pressure-stage-formula">
                  {sourceType === "point"
                    ? tt("点光源：被遮挡的光线在屏上形成边界清晰的暗区。")
                    : tt("面光源：中央是本影，两侧是只遮住部分光线的半影。")}
                </p>
              </div>
            </div>

            <div className="force-stage-overlay is-bottom-right">
              <div className="force-stage-hud-card is-tight shadow-stage-summary-card">
                <div className="force-stage-hud-head">
                  <span className="force-stage-hud-title">{isZh ? "课堂摘要" : "Classroom Summary"}</span>
                  <span className="force-stage-chip">{isZh ? `${recordedCount} / 4` : `${recordedCount} / 4`}</span>
                </div>
                <div className="shadow-stage-summary-grid">
                  {summaryItems.map((item) => (
                    <article key={item.label} className="shadow-stage-summary-item">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <svg
              className="shadow-stage-svg"
              viewBox={`0 0 ${SVG_STAGE.width} ${SVG_STAGE.height}`}
              role="img"
              aria-label={tt(topic.title)}
            >
              <defs>
                <linearGradient id="shadow-screen-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(214, 228, 245, 0.2)" />
                  <stop offset="100%" stopColor="rgba(214, 228, 245, 0.08)" />
                </linearGradient>
                <linearGradient id="shadow-object-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6b7280" />
                  <stop offset="100%" stopColor="#293445" />
                </linearGradient>
              </defs>

              <rect
                x={SVG_STAGE.panelX}
                y={SVG_STAGE.panelY}
                width={SVG_STAGE.panelWidth}
                height={SVG_STAGE.panelHeight}
                rx="28"
                className="shadow-stage-panel"
              />

              <line
                x1={SVG_STAGE.panelX + 44}
                y1={SVG_STAGE.benchY}
                x2={SVG_STAGE.panelX + SVG_STAGE.panelWidth - 44}
                y2={SVG_STAGE.benchY}
                className="shadow-stage-bench"
              />

              {showRays ? (
                <>
                  {sourceType === "point" ? (
                    <>
                      <path
                        d={`M ${scene.sourceX} ${scene.sourceCenterY} L ${scene.objectLeftX} ${scene.objectTopY} L ${scene.screenX} ${scene.pointShadowTopY}`}
                        className="shadow-stage-ray is-point"
                      />
                      <path
                        d={`M ${scene.sourceX} ${scene.sourceCenterY} L ${scene.objectLeftX} ${scene.objectBottomY} L ${scene.screenX} ${scene.pointShadowBottomY}`}
                        className="shadow-stage-ray is-point"
                      />
                    </>
                  ) : (
                    <>
                      <path
                        d={`M ${scene.sourceX} ${scene.sourceTopY} L ${scene.objectLeftX} ${scene.objectTopY} L ${scene.screenX} ${scene.umbraTopY}`}
                        className="shadow-stage-ray is-umbra"
                      />
                      <path
                        d={`M ${scene.sourceX} ${scene.sourceBottomY} L ${scene.objectLeftX} ${scene.objectBottomY} L ${scene.screenX} ${scene.umbraBottomY}`}
                        className="shadow-stage-ray is-umbra"
                      />
                      <path
                        d={`M ${scene.sourceX} ${scene.sourceBottomY} L ${scene.objectLeftX} ${scene.objectTopY} L ${scene.screenX} ${scene.outerShadowTopY}`}
                        className="shadow-stage-ray is-outer"
                      />
                      <path
                        d={`M ${scene.sourceX} ${scene.sourceTopY} L ${scene.objectLeftX} ${scene.objectBottomY} L ${scene.screenX} ${scene.outerShadowBottomY}`}
                        className="shadow-stage-ray is-outer"
                      />
                    </>
                  )}
                </>
              ) : null}

              <g className="shadow-stage-source">
                <line
                  x1={scene.sourceX}
                  y1={scene.sourceBottomY}
                  x2={scene.sourceX}
                  y2={SVG_STAGE.benchY}
                  className="shadow-stage-source-stand"
                />
                <circle
                  cx={scene.sourceX}
                  cy={scene.sourceCenterY}
                  r={sourceType === "point" ? 16 : 28}
                  className="shadow-stage-source-glow"
                />
                {sourceType === "point" ? (
                  <circle
                    cx={scene.sourceX}
                    cy={scene.sourceCenterY}
                    r="10"
                    className="shadow-stage-source-point"
                  />
                ) : (
                  <rect
                    x={scene.sourceX - 12}
                    y={scene.sourceTopY}
                    width="24"
                    height={scene.sourceBottomY - scene.sourceTopY}
                    rx="12"
                    className="shadow-stage-source-area"
                  />
                )}
                <text x={scene.sourceX - 34} y={scene.sourceTopY - 18} className="shadow-stage-label">
                  {sourceType === "point" ? tt("点光源") : tt("面光源")}
                </text>
              </g>

              <g className="shadow-stage-object">
                <rect
                  x={scene.objectLeftX}
                  y={scene.objectTopY}
                  width={scene.objectRightX - scene.objectLeftX}
                  height={scene.objectBottomY - scene.objectTopY}
                  rx="14"
                  fill="url(#shadow-object-gradient)"
                  className="shadow-stage-object-body"
                />
                <line
                  x1={(scene.objectLeftX + scene.objectRightX) / 2}
                  y1={scene.objectBottomY}
                  x2={(scene.objectLeftX + scene.objectRightX) / 2}
                  y2={SVG_STAGE.benchY}
                  className="shadow-stage-object-stand"
                />
                <text x={scene.objectLeftX - 8} y={scene.objectTopY - 18} className="shadow-stage-label">
                  {tt("不透明物体")}
                </text>
              </g>

              <g className="shadow-stage-screen">
                <rect
                  x={scene.screenX - 18}
                  y={scene.screenTopY}
                  width="36"
                  height={scene.screenBottomY - scene.screenTopY}
                  rx="18"
                  fill="url(#shadow-screen-gradient)"
                  className="shadow-stage-screen-frame"
                />

                {sourceType === "point" ? (
                  <rect
                    x={scene.screenX - 14}
                    y={scene.pointShadowTopY}
                    width="28"
                    height={Math.max(4, scene.pointShadowBottomY - scene.pointShadowTopY)}
                    className="shadow-stage-screen-shadow is-sharp"
                  />
                ) : (
                  <>
                    <rect
                      x={scene.screenX - 14}
                      y={scene.outerShadowTopY}
                      width="28"
                      height={Math.max(0, scene.umbraTopY - scene.outerShadowTopY)}
                      className="shadow-stage-screen-shadow is-penumbra"
                    />
                    <rect
                      x={scene.screenX - 14}
                      y={scene.umbraTopY}
                      width="28"
                      height={Math.max(0, scene.umbraBottomY - scene.umbraTopY)}
                      className="shadow-stage-screen-shadow is-umbra"
                    />
                    <rect
                      x={scene.screenX - 14}
                      y={scene.umbraBottomY}
                      width="28"
                      height={Math.max(0, scene.outerShadowBottomY - scene.umbraBottomY)}
                      className="shadow-stage-screen-shadow is-penumbra"
                    />

                    <text x={scene.screenX + 34} y={scene.umbraTopY + 18} className="shadow-stage-shadow-label">
                      {tt("本影")}
                    </text>
                    <text x={scene.screenX + 34} y={scene.outerShadowTopY + 18} className="shadow-stage-shadow-label is-soft">
                      {tt("半影")}
                    </text>
                    <text x={scene.screenX + 34} y={scene.outerShadowBottomY - 10} className="shadow-stage-shadow-label is-soft">
                      {tt("半影")}
                    </text>
                  </>
                )}

                <text x={scene.screenX - 20} y={scene.screenTopY - 18} className="shadow-stage-label">
                  {tt("光屏")}
                </text>
              </g>

            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

function buildShadowScene({
  sourceType,
  objectDistanceCm,
  screenDistanceCm,
  sourceSizeCm,
}: {
  sourceType: SourceType;
  objectDistanceCm: number;
  screenDistanceCm: number;
  sourceSizeCm: number;
}): ShadowScene {
  const objectLeftX = SVG_STAGE.sourceX + objectDistanceCm * SVG_STAGE.objectScaleX;
  const objectRightX = objectLeftX + SVG_STAGE.objectWidth;
  const objectTopY = SVG_STAGE.objectBaseY - SVG_STAGE.objectHeight;
  const objectBottomY = SVG_STAGE.objectBaseY;
  const screenX = objectRightX + screenDistanceCm * SVG_STAGE.screenScaleX;
  const sourceHalfHeight = sourceType === "point" ? 10 : Math.max(18, sourceSizeCm * 4.2);
  const sourceTopY = SVG_STAGE.sourceCenterY - sourceHalfHeight;
  const sourceBottomY = SVG_STAGE.sourceCenterY + sourceHalfHeight;

  const pointTopRaw = projectY(SVG_STAGE.sourceX, SVG_STAGE.sourceCenterY, objectLeftX, objectTopY, screenX);
  const pointBottomRaw = projectY(SVG_STAGE.sourceX, SVG_STAGE.sourceCenterY, objectLeftX, objectBottomY, screenX);

  const outerTopRaw = sourceType === "point"
    ? pointTopRaw
    : projectY(SVG_STAGE.sourceX, sourceBottomY, objectLeftX, objectTopY, screenX);
  const outerBottomRaw = sourceType === "point"
    ? pointBottomRaw
    : projectY(SVG_STAGE.sourceX, sourceTopY, objectLeftX, objectBottomY, screenX);
  const umbraTopRaw = sourceType === "point"
    ? pointTopRaw
    : projectY(SVG_STAGE.sourceX, sourceTopY, objectLeftX, objectTopY, screenX);
  const umbraBottomRaw = sourceType === "point"
    ? pointBottomRaw
    : projectY(SVG_STAGE.sourceX, sourceBottomY, objectLeftX, objectBottomY, screenX);

  const pointShadowTopY = clamp(Math.min(pointTopRaw, pointBottomRaw), SVG_STAGE.screenTopY, SVG_STAGE.screenBottomY);
  const pointShadowBottomY = clamp(Math.max(pointTopRaw, pointBottomRaw), SVG_STAGE.screenTopY, SVG_STAGE.screenBottomY);
  const outerShadowTopY = clamp(Math.min(outerTopRaw, outerBottomRaw), SVG_STAGE.screenTopY, SVG_STAGE.screenBottomY);
  const outerShadowBottomY = clamp(Math.max(outerTopRaw, outerBottomRaw), SVG_STAGE.screenTopY, SVG_STAGE.screenBottomY);
  const umbraTopY = clamp(Math.min(umbraTopRaw, umbraBottomRaw), SVG_STAGE.screenTopY, SVG_STAGE.screenBottomY);
  const umbraBottomY = clamp(Math.max(umbraTopRaw, umbraBottomRaw), SVG_STAGE.screenTopY, SVG_STAGE.screenBottomY);

  const shadowHeightPx = sourceType === "point"
    ? pointShadowBottomY - pointShadowTopY
    : outerShadowBottomY - outerShadowTopY;
  const umbraHeightPx = sourceType === "point" ? 0 : Math.max(0, umbraBottomY - umbraTopY);
  const penumbraHeightPx = sourceType === "point"
    ? 0
    : Math.max(0, shadowHeightPx - umbraHeightPx);

  return {
    sourceX: SVG_STAGE.sourceX,
    sourceCenterY: SVG_STAGE.sourceCenterY,
    sourceTopY,
    sourceBottomY,
    objectLeftX,
    objectRightX,
    objectTopY,
    objectBottomY,
    screenX,
    screenTopY: SVG_STAGE.screenTopY,
    screenBottomY: SVG_STAGE.screenBottomY,
    pointShadowTopY,
    pointShadowBottomY,
    outerShadowTopY,
    outerShadowBottomY,
    umbraTopY,
    umbraBottomY,
    shadowHeightCm: shadowHeightPx * SVG_STAGE.shadowScaleCmPerPx,
    umbraHeightCm: umbraHeightPx * SVG_STAGE.shadowScaleCmPerPx,
    penumbraHeightCm: penumbraHeightPx * SVG_STAGE.shadowScaleCmPerPx,
  };
}

function describeObservation({
  step,
  sourceType,
  scene,
  isZh,
}: {
  step: ShadowStepKey;
  sourceType: SourceType;
  scene: ShadowScene;
  isZh: boolean;
}) {
  if (!isZh) {
    switch (step) {
      case "point-shadow":
        return `The point source creates a sharp shadow on the screen with a height of ${formatMeasure(scene.shadowHeightCm)} cm.`;
      case "area-shadow":
        return `The area source shows a ${formatMeasure(scene.umbraHeightCm)} cm umbra with penumbra on both sides.`;
      case "object-near-source":
        return `Moving the object closer to the source expands the shadow to ${formatMeasure(scene.shadowHeightCm)} cm.`;
      case "screen-near-object":
        return `Moving the screen closer compresses the shadow and narrows the penumbra.`;
    }
  }

  switch (step) {
    case "point-shadow":
      return `点光源被物体遮挡后，屏上得到边界清晰的影子，当前影子高度约 ${formatMeasure(scene.shadowHeightCm)} cm。`;
    case "area-shadow":
      return `面光源下，中央约 ${formatMeasure(scene.umbraHeightCm)} cm 的区域是本影，两侧是半影。`;
    case "object-near-source":
      return `把物体靠近光源后，影子扩大到约 ${formatMeasure(scene.shadowHeightCm)} cm。`;
    case "screen-near-object":
      return "把光屏向物体靠近后，影子缩小，半影范围也明显收窄。";
  }
}

function buildRecordValue({
  step,
  sourceType,
  scene,
  isZh,
}: {
  step: ShadowStepKey;
  sourceType: SourceType;
  scene: ShadowScene;
  isZh: boolean;
}) {
  if (!isZh) {
    switch (step) {
      case "point-shadow":
        return `Sharp shadow · ${formatMeasure(scene.shadowHeightCm)} cm`;
      case "area-shadow":
        return `Umbra ${formatMeasure(scene.umbraHeightCm)} cm · Penumbra ${formatMeasure(scene.penumbraHeightCm)} cm`;
      case "object-near-source":
        return `Shadow grows to ${formatMeasure(scene.shadowHeightCm)} cm`;
      case "screen-near-object":
        return `Shadow shrinks · penumbra narrows`;
    }
  }

  switch (step) {
    case "point-shadow":
      return `边界清晰 · 影高 ${formatMeasure(scene.shadowHeightCm)} cm`;
    case "area-shadow":
      return `本影 ${formatMeasure(scene.umbraHeightCm)} cm · 半影 ${formatMeasure(scene.penumbraHeightCm)} cm`;
    case "object-near-source":
      return `影子变大到 ${formatMeasure(scene.shadowHeightCm)} cm`;
    case "screen-near-object":
      return "影子缩小 · 半影收窄";
  }
}

function findNextPendingStep(records: Partial<Record<ShadowStepKey, ShadowRecord>>) {
  return STEP_SEQUENCE.find((key) => !records[key]);
}

function currentStepRecorded(
  records: Partial<Record<ShadowStepKey, ShadowRecord>>,
  step: ShadowStepKey,
) {
  return Boolean(records[step]);
}

function clearObservationTimer(timerId: TimerId | null) {
  if (timerId) {
    clearInterval(timerId);
  }
}

function projectY(
  sourceX: number,
  sourceY: number,
  objectX: number,
  objectY: number,
  targetX: number,
) {
  return sourceY + ((targetX - sourceX) * (objectY - sourceY)) / (objectX - sourceX);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatMeasure(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

function PanelChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d={collapsed ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
