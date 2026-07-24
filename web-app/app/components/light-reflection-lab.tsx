import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import type { TeachingTopic } from "../data/teaching-catalog";
import { useLocale } from "../i18n";
import { BasicForceRecordTable } from "./basic-force-record-table";
import { ControlButton } from "./control-button";
import { ControlChipGroup } from "./control-chip-group";
import { ControlPanelSection } from "./control-panel-section";
import { ControlRange } from "./control-range";
import { ControlStatusBar } from "./control-status-bar";
import { ControlStepGroup } from "./control-step-group";
import { StatusPill } from "./status-pill";

type LightReflectionLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type ReflectionStepKey = "equal-angle" | "coplanar" | "reversible" | "diffuse";
type ReflectionMode = "specular" | "diffuse";
type ObservationState = "idle" | "observing" | "stable";
type TimerId = ReturnType<typeof setInterval>;

type ReflectionStepPreset = {
  key: ReflectionStepKey;
  stepLabel: string;
  label: string;
  summary: string;
  focus: string;
  angle: number;
  mode: ReflectionMode;
  foldAngle: number;
  reversed: boolean;
};

type ReflectionRecord = {
  key: ReflectionStepKey;
  value: string;
  note: string;
};

type StepSummary = {
  label: string;
  value: string;
};

const PANEL_COLLAPSED_STORAGE_KEY = "easy-teaching.light-reflection.panel-collapsed";
const OBSERVATION_TICK_MS = 40;
const OBSERVATION_DURATION_MS = 960;
const STEP_SEQUENCE: ReflectionStepKey[] = [
  "equal-angle",
  "coplanar",
  "reversible",
  "diffuse",
];

const STEP_PRESETS: Record<ReflectionStepKey, ReflectionStepPreset> = {
  "equal-angle": {
    key: "equal-angle",
    stepLabel: "1",
    label: "等角性",
    summary: "先调节入射角，观察反射角始终与入射角相等。",
    focus: "反射角和入射角都是相对于法线而言，并且始终相等。",
    angle: 45,
    mode: "specular",
    foldAngle: 0,
    reversed: false,
  },
  coplanar: {
    key: "coplanar",
    stepLabel: "2",
    label: "共面性",
    summary: "保持镜面反射，折起纸板右半侧，观察反射光线会离开折起的纸板。",
    focus: "反射光线、入射光线和法线只有在同一平面内时，才能同时落在纸板上。",
    angle: 38,
    mode: "specular",
    foldAngle: 0,
    reversed: false,
  },
  reversible: {
    key: "reversible",
    stepLabel: "3",
    label: "光路可逆",
    summary: "交换入射和反射方向，观察光线沿原路径返回。",
    focus: "把反射光线反向作为新的入射光线时，光路会沿原路径返回。",
    angle: 58,
    mode: "specular",
    foldAngle: 0,
    reversed: false,
  },
  diffuse: {
    key: "diffuse",
    stepLabel: "4",
    label: "漫反射",
    summary: "切换到粗糙表面，观察平行入射光会向各方向散射。",
    focus: "漫反射也遵循反射定律，只是粗糙面上每个点的法线方向不同。",
    angle: 44,
    mode: "diffuse",
    foldAngle: 0,
    reversed: false,
  },
};

const SVG_STAGE = {
  width: 1160,
  height: 760,
  panelX: 56,
  panelY: 86,
  panelWidth: 1048,
  panelHeight: 572,
  originX: 580,
  originY: 412,
  rayLength: 256,
  mirrorHalfWidth: 286,
};

export function LightReflectionLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: LightReflectionLabProps) {
  const { isZh, tt } = useLocale();
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  const [activeStep, setActiveStep] = useState<ReflectionStepKey>("equal-angle");
  const [incidentAngle, setIncidentAngle] = useState(STEP_PRESETS["equal-angle"].angle);
  const [reflectionMode, setReflectionMode] = useState<ReflectionMode>(STEP_PRESETS["equal-angle"].mode);
  const [foldAngle, setFoldAngle] = useState(STEP_PRESETS["equal-angle"].foldAngle);
  const [isReversed, setIsReversed] = useState(STEP_PRESETS["equal-angle"].reversed);
  const [showNormal, setShowNormal] = useState(true);
  const [observationState, setObservationState] = useState<ObservationState>("idle");
  const [progress, setProgress] = useState(0);
  const [records, setRecords] = useState<Partial<Record<ReflectionStepKey, ReflectionRecord>>>({});
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
  const reflectionAngle = incidentAngle;
  const recordedCount = STEP_SEQUENCE.filter((key) => records[key]).length;
  const currentStepRecorded = Boolean(records[activeStep]);
  const isRecordEnabled = observationState === "stable";
  const reflectedRayVisibility = reflectionMode === "specular"
    ? Math.max(0, 1 - foldAngle / 18)
    : 1;

  const stageMeta = useMemo(() => {
    const currentCopy = describeStepObservation({
      step: activeStep,
      incidentAngle,
      foldAngle,
      reflectionMode,
      isReversed,
      isZh,
    });

    if (observationState === "stable") {
      return {
        label: isZh ? "现象稳定" : "Ready to record",
        tone: "balanced" as const,
        copy: currentCopy,
      };
    }

    if (observationState === "observing") {
      return {
        label: isZh ? "观察中" : "Observing",
        tone: "active" as const,
        copy: currentCopy,
      };
    }

    return {
      label: isZh ? "待观察" : "Ready",
      tone: "warning" as const,
      copy: activePreset.summary,
    };
  }, [activePreset.summary, activeStep, foldAngle, incidentAngle, isReversed, isZh, observationState, reflectionMode]);

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

  const recordGroups = [
    {
      key: "reflection",
      title: isZh ? "四组课堂验证" : "Four classroom checks",
      countLabel: isZh ? `${recordedCount} / 4 组` : `${recordedCount} / 4 runs`,
      isActive: true,
      helper: isZh
        ? "按“等角性 -> 共面性 -> 光路可逆 -> 漫反射”依次验证，最后再统一归纳反射定律。"
        : "Check equal angles, coplanarity, reversibility, then diffuse reflection.",
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
            ? "课堂结论：反射光线、入射光线和法线在同一平面内，反射角等于入射角；镜面反射和漫反射都遵循反射定律，且光路可逆。"
            : "Conclusion: the incident ray, reflected ray, and normal stay in one plane; the reflected angle equals the incident angle, and the light path is reversible.")
          : undefined,
    },
  ];

  const summaryItems: StepSummary[] = useMemo(() => {
    return [
      {
        label: isZh ? "当前模式" : "Mode",
        value: reflectionMode === "specular" ? tt("镜面反射") : tt("漫反射"),
      },
      {
        label: isZh ? "当前结论" : "Current takeaway",
        value: tt(activePreset.focus),
      },
    ];
  }, [activePreset.focus, isZh, reflectionMode, tt]);

  const scene = useMemo(
    () =>
      buildScene({
        incidentAngle,
        reflectionAngle,
        reflectionMode,
        isReversed,
        progress,
      }),
    [incidentAngle, isReversed, progress, reflectionAngle, reflectionMode],
  );

  function invalidateObservation() {
    clearObservationTimer(timerRef.current);
    timerRef.current = null;
    setObservationState("idle");
    setProgress(0);
  }

  function applyPreset(step: ReflectionStepKey) {
    const preset = STEP_PRESETS[step];
    setActiveStep(step);
    setIncidentAngle(preset.angle);
    setReflectionMode(preset.mode);
    setFoldAngle(preset.foldAngle);
    setIsReversed(preset.reversed);
    invalidateObservation();
  }

  function startObservation() {
    clearObservationTimer(timerRef.current);
    timerRef.current = null;
    setObservationState("observing");
    setProgress(0);

    let elapsedMs = 0;
    timerRef.current = globalThis.setInterval(() => {
      elapsedMs = Math.min(elapsedMs + OBSERVATION_TICK_MS, OBSERVATION_DURATION_MS);
      const nextProgress =
        OBSERVATION_DURATION_MS <= 0 ? 1 : elapsedMs / OBSERVATION_DURATION_MS;

      setProgress(nextProgress);

      if (nextProgress >= 1) {
        clearObservationTimer(timerRef.current);
        timerRef.current = null;
        setObservationState("stable");
      }
    }, OBSERVATION_TICK_MS);
  }

  function recordCurrentObservation() {
    if (!isRecordEnabled) {
      return;
    }

    const nextRecords = {
      ...records,
      [activeStep]: {
        key: activeStep,
        value: buildRecordValue({
          step: activeStep,
          incidentAngle,
          reflectionAngle,
          foldAngle,
          reflectionMode,
          isZh,
        }),
        note: buildRecordNote({
          step: activeStep,
          incidentAngle,
          reflectionAngle,
          foldAngle,
          reflectionMode,
          isReversed,
          isZh,
        }),
      },
    };

    setRecords(nextRecords);

    const nextStep = STEP_SEQUENCE.find((key) => !nextRecords[key]);
    if (nextStep) {
      applyPreset(nextStep);
    }
  }

  function resetLab() {
    clearObservationTimer(timerRef.current);
    timerRef.current = null;
    setActiveStep("equal-angle");
    setIncidentAngle(STEP_PRESETS["equal-angle"].angle);
    setReflectionMode(STEP_PRESETS["equal-angle"].mode);
    setFoldAngle(0);
    setIsReversed(false);
    setShowNormal(true);
    setObservationState("idle");
    setProgress(0);
    setRecords({});
  }

  const primaryActionLabel = observationState === "observing"
    ? (isZh ? "观察中…" : "Observing…")
    : observationState === "stable"
      ? (isZh ? "重新观察" : "Replay")
      : (isZh ? "开始观察" : "Start");
  const recordButtonLabel = currentStepRecorded
    ? (isZh ? "更新本组" : "Update current run")
    : (isZh ? "记录本组" : "Record current run");

  return (
    <section ref={fullscreenRef} className="visual-shell force-lab-shell reflection-lab-shell">
      <div
        className={
          isControlPanelCollapsed
            ? "force-lab-layout reflection-lab-layout is-collapsed"
            : "force-lab-layout reflection-lab-layout"
        }
      >
        <aside
          className={
            isControlPanelCollapsed
              ? "force-control-panel reflection-control-panel is-collapsed"
              : "force-control-panel reflection-control-panel"
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

              <div className="force-control-scroll reflection-control-scroll">
                <ControlPanelSection
                  title={isZh ? "课堂主流程" : "Classroom Flow"}
                  hint={isZh ? "先看等角，再验证共面、可逆和漫反射" : "Angles first, then coplanarity, reversibility, and diffuse reflection"}
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
                  title={isZh ? "核心参数" : "Core Variables"}
                  hint={isZh ? "入射角和反射角都相对于法线" : "Both angles are measured from the normal"}
                >
                  <ControlRange
                    id="reflection-incident-angle"
                    label={isZh ? "入射角 ∠i" : "Incident angle ∠i"}
                    min={0}
                    max={80}
                    step={1}
                    unit="°"
                    value={incidentAngle}
                    editable
                    onChange={(value) => {
                      setIncidentAngle(value);
                      invalidateObservation();
                    }}
                  />

                  <ControlRange
                    id="reflection-fold-angle"
                    label={isZh ? "纸板后折角" : "Fold angle"}
                    min={0}
                    max={90}
                    step={1}
                    unit="°"
                    value={foldAngle}
                    editable
                    disabled={activeStep !== "coplanar"}
                    onChange={(value) => {
                      setFoldAngle(value);
                      invalidateObservation();
                    }}
                  />

                  <div className="pressure-inline-lock-grid">
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "反射角 ∠r" : "Reflected ∠r"}</span>
                      <strong className="force-insight-value">{reflectionAngle}°</strong>
                    </article>
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "与镜面夹角" : "With mirror"}</span>
                      <strong className="force-insight-value">{90 - incidentAngle}°</strong>
                    </article>
                  </div>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "模式切换" : "Mode Switch"}
                  hint={isZh ? "镜面与漫反射都遵循反射定律" : "Both specular and diffuse reflection follow the law"}
                >
                  <ControlChipGroup
                    items={[
                      {
                        key: "specular",
                        label: tt("镜面反射"),
                        active: reflectionMode === "specular",
                        onClick: () => {
                          setReflectionMode("specular");
                          invalidateObservation();
                        },
                      },
                      {
                        key: "diffuse",
                        label: tt("漫反射"),
                        active: reflectionMode === "diffuse",
                        onClick: () => {
                          setReflectionMode("diffuse");
                          setIsReversed(false);
                          invalidateObservation();
                        },
                      },
                    ]}
                    columns={2}
                    size="dense"
                  />

                  <ControlChipGroup
                    items={[
                      {
                        key: "show-normal",
                        label: tt("显示法线"),
                        active: showNormal,
                        onClick: () => setShowNormal((previous) => !previous),
                      },
                      {
                        key: "reverse",
                        label: isReversed ? tt("逆向验证") : tt("正向入射"),
                        active: isReversed,
                        disabled: reflectionMode === "diffuse",
                        onClick: () => {
                          setIsReversed((previous) => !previous);
                          invalidateObservation();
                        },
                      },
                    ]}
                    columns={2}
                    size="dense"
                  />
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "操作与记录" : "Observe & Record"}
                  hint={isZh ? "观察稳定后再记录本组" : "Record only after the geometry settles"}
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
                        ? "记录单会保留四组课堂验证过程，最后统一归纳光的反射定律。"
                        : "The worksheet keeps the four classroom checks for the final conclusion."
                    }
                    pendingCopy={isZh ? "待测" : "Pending"}
                  />
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "思考提示" : "Think Prompt"}
                  hint={isZh ? "帮助区分镜面反射和漫反射" : "Separate specular and diffuse reflection"}
                >
                  <ul className="force-support-question-list">
                    <li>{isZh ? "为什么入射角和反射角都必须相对于法线，而不是相对于镜面？" : "Why are both angles measured from the normal, not the mirror?"}</li>
                    <li>{isZh ? "漫反射为什么也遵循反射定律，却不能形成清晰的像？" : "Why does diffuse reflection still obey the law but fail to form a clear image?"}</li>
                    <li>{isZh ? "入射角增大 10° 时，入射光线和反射光线的夹角会怎么变？" : "What happens to the angle between the two rays when the incident angle increases by 10°?"}</li>
                  </ul>
                </ControlPanelSection>
              </div>
            </>
          )}
        </aside>

        <div className="force-lab-main reflection-lab-main">
          <div className="force-toolbar">
            <div className="force-toolbar-status">
              <StatusPill tone="active">{tt("光的反射")}</StatusPill>
              <StatusPill tone={stageMeta.tone}>{stageMeta.label}</StatusPill>
            </div>
            <div className="force-toolbar-actions">
              <button
                type="button"
                onClick={() => {
                  void onToggleFullscreen();
                }}
                className="fullscreen-button is-compact"
                aria-label={isFullscreen ? tt("退出全屏") : tt("进入全屏")}
                title={isFullscreen ? tt("退出全屏") : tt("进入全屏")}
              >
                {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
              </button>
            </div>
          </div>

          <div className="visual-canvas force-stage-canvas reflection-stage-canvas is-2d-mode">
            <ControlStepGroup
              className="force-stage-overlay is-top-center force-stage-stepbar reflection-stage-stepbar"
              items={stepItems}
            />
            <div className="visual-grid-layer" />
            <div className="visual-glow visual-glow-a" />
            <div className="visual-glow visual-glow-b" />

            <div className="force-stage-overlay is-top-left">
              <div className="force-stage-hud-card">
                <div className="force-stage-hud-head">
                  <span className="force-stage-hud-title">{tt("当前验证重点")}</span>
                  <StatusPill tone={stageMeta.tone}>{stageMeta.label}</StatusPill>
                </div>
                <p className="pressure-stage-copy">{tt(activePreset.focus)}</p>
                <div className="force-stage-chip-grid">
                  <span className="force-stage-chip">
                    {reflectionMode === "specular" ? tt("镜面反射") : tt("漫反射")}
                  </span>
                  <span className="force-stage-chip">
                    {isReversed ? tt("逆向验证") : tt("正向入射")}
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
                    <strong>{incidentAngle}°</strong>
                    <span>{isZh ? "入射角 ∠i" : "Incident ∠i"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{reflectionAngle}°</strong>
                    <span>{isZh ? "反射角 ∠r" : "Reflected ∠r"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{foldAngle}°</strong>
                    <span>{isZh ? "后折角" : "Fold"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{90 - incidentAngle}°</strong>
                    <span>{isZh ? "与镜面夹角" : "With mirror"}</span>
                  </article>
                </div>
                <p className="pressure-stage-formula">
                  {reflectionMode === "specular"
                    ? `∠r = ∠i = ${incidentAngle}°`
                    : tt("粗糙面各点的法线不同，所以会向各方向散射。")}
                </p>
              </div>
            </div>

            <div className="force-stage-overlay is-bottom-right">
              <div className="force-stage-hud-card is-tight reflection-stage-summary-card">
                <div className="force-stage-hud-head">
                  <span className="force-stage-hud-title">{isZh ? "课堂摘要" : "Classroom Summary"}</span>
                  <span className="force-stage-chip">{isZh ? `${recordedCount} / 4` : `${recordedCount} / 4`}</span>
                </div>
                <div className="reflection-stage-summary-grid">
                  {summaryItems.map((item) => (
                    <article key={item.label} className="reflection-stage-summary-item">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${SVG_STAGE.width} ${SVG_STAGE.height}`}
              className="force-stage-svg reflection-stage-svg"
              role="img"
              aria-label={isZh ? `${tt(topic.title)}可视化示意图` : `${tt(topic.title)} visualization`}
            >
              <defs>
                <marker id="reflection-arrow-incident" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto">
                  <path d="M0,0 L12,6 L0,12 z" fill="#ffbf67" />
                </marker>
                <marker id="reflection-arrow-reflected" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto">
                  <path d="M0,0 L12,6 L0,12 z" fill="#67c6ff" />
                </marker>
              </defs>

              <rect
                x={SVG_STAGE.panelX}
                y={SVG_STAGE.panelY}
                width={SVG_STAGE.panelWidth}
                height={SVG_STAGE.panelHeight}
                rx="34"
                className="motion-stage-panel-shell"
              />
              <text x={SVG_STAGE.panelX + 34} y={SVG_STAGE.panelY + 30} className="motion-stage-panel-title">
                {tt("反射几何舞台")}
              </text>
              <text x={SVG_STAGE.panelX + 34} y={SVG_STAGE.panelY + 54} className="motion-stage-panel-copy">
                {tt("拖角度看等角，折纸板看共面，切换方向看光路可逆。")}
              </text>

              <line
                x1={SVG_STAGE.originX - SVG_STAGE.mirrorHalfWidth}
                y1={SVG_STAGE.originY}
                x2={SVG_STAGE.originX + SVG_STAGE.mirrorHalfWidth}
                y2={SVG_STAGE.originY}
                className={
                  reflectionMode === "specular"
                    ? "reflection-stage-mirror-line"
                    : "reflection-stage-mirror-line is-diffuse"
                }
              />

              {reflectionMode === "diffuse" ? (
                <path
                  d={`M ${SVG_STAGE.originX - SVG_STAGE.mirrorHalfWidth} ${SVG_STAGE.originY}
                    Q ${SVG_STAGE.originX - 180} ${SVG_STAGE.originY - 12}
                    ${SVG_STAGE.originX - 80} ${SVG_STAGE.originY + 8}
                    T ${SVG_STAGE.originX + 80} ${SVG_STAGE.originY - 6}
                    T ${SVG_STAGE.originX + SVG_STAGE.mirrorHalfWidth} ${SVG_STAGE.originY + 6}`}
                  className="reflection-stage-rough-surface"
                />
              ) : null}

              {showNormal ? (
                <line
                  x1={SVG_STAGE.originX}
                  y1={SVG_STAGE.originY - 248}
                  x2={SVG_STAGE.originX}
                  y2={SVG_STAGE.originY + 120}
                  className="reflection-stage-normal-line"
                />
              ) : null}

              <circle cx={SVG_STAGE.originX} cy={SVG_STAGE.originY} r="7" className="reflection-stage-origin-dot" />
              <text x={SVG_STAGE.originX + 12} y={SVG_STAGE.originY - 12} className="motion-stage-ruler-label">
                {tt("入射点")}
              </text>

              <path
                d={scene.incidentPath}
                className="reflection-stage-ray is-incident"
                markerEnd="url(#reflection-arrow-incident)"
              />

              {reflectionMode === "specular" ? (
                <path
                  d={scene.reflectedPath}
                  className="reflection-stage-ray is-reflected"
                  style={{ opacity: reflectedRayVisibility }}
                  markerEnd="url(#reflection-arrow-reflected)"
                />
              ) : (
                scene.diffusePaths.map((path, index) => (
                  <path
                    key={`diffuse-${index}`}
                    d={path}
                    className={index === 2 ? "reflection-stage-ray is-reflected" : "reflection-stage-ray is-diffuse"}
                    markerEnd="url(#reflection-arrow-reflected)"
                  />
                ))
              )}

              {incidentAngle > 0 ? (
                <>
                  <path d={scene.incidentArc} className="reflection-stage-angle-arc is-incident" />
                  <path
                    d={scene.reflectedArc}
                    className="reflection-stage-angle-arc is-reflected"
                    style={{ opacity: reflectionMode === "specular" ? reflectedRayVisibility : 1 }}
                  />
                </>
              ) : null}

              <text x={scene.incidentLabel.x} y={scene.incidentLabel.y} textAnchor="middle" className="motion-stage-value-callout">
                {`∠i ${incidentAngle}°`}
              </text>
              <text
                x={scene.reflectedLabel.x}
                y={scene.reflectedLabel.y}
                textAnchor="middle"
                className="motion-stage-value-callout"
                style={{ opacity: reflectionMode === "specular" ? reflectedRayVisibility : 1 }}
              >
                {`∠r ${reflectionAngle}°`}
              </text>

              {activeStep === "coplanar" && foldAngle > 0 ? (
                <>
                  <path d={scene.foldedBoardPath} className="reflection-stage-fold-board" />
                  <text x={SVG_STAGE.originX + 142} y={SVG_STAGE.originY - 166} className="motion-stage-value-callout">
                    {isZh ? `后折 ${foldAngle}°` : `Fold ${foldAngle}°`}
                  </text>
                  {reflectedRayVisibility <= 0.08 ? (
                    <text x={SVG_STAGE.originX + 166} y={SVG_STAGE.originY - 128} className="reflection-stage-fold-note">
                      {tt("反射光线离开折起纸板")}
                    </text>
                  ) : null}
                </>
              ) : null}

              {reflectionMode === "diffuse" ? (
                <text x={SVG_STAGE.originX + 172} y={SVG_STAGE.originY - 118} className="reflection-stage-diffuse-note">
                  {tt("粗糙表面上各点法线不同，因此反射光线向各方向散开")}
                </text>
              ) : null}

              <text x={SVG_STAGE.panelX + 34} y={SVG_STAGE.panelY + 470} className="motion-stage-panel-title">
                {tt("当前判断")}
              </text>
              <text x={SVG_STAGE.panelX + 34} y={SVG_STAGE.panelY + 500} className="pressure-stage-label">
                {tt(stageMeta.copy)}
              </text>
              <text x={SVG_STAGE.panelX + 34} y={SVG_STAGE.panelY + 532} className="pressure-stage-value">
                {reflectionMode === "specular"
                  ? `∠r = ∠i = ${incidentAngle}°`
                  : tt("漫反射也遵循反射定律，但不能形成清晰的像。")}
              </text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

function buildScene({
  incidentAngle,
  reflectionAngle,
  reflectionMode,
  isReversed,
  progress,
}: {
  incidentAngle: number;
  reflectionAngle: number;
  reflectionMode: ReflectionMode;
  isReversed: boolean;
  progress: number;
}) {
  const originX = SVG_STAGE.originX;
  const originY = SVG_STAGE.originY;
  const rayLength = SVG_STAGE.rayLength * (0.66 + 0.34 * progress);
  const incidentRad = degreesToRadians(incidentAngle);

  const fromLeft = {
    x: originX - Math.sin(incidentRad) * rayLength,
    y: originY - Math.cos(incidentRad) * rayLength,
  };
  const fromRight = {
    x: originX + Math.sin(incidentRad) * rayLength,
    y: originY - Math.cos(incidentRad) * rayLength,
  };

  const incidentStart = isReversed ? fromRight : fromLeft;
  const reflectedEnd = isReversed ? fromLeft : fromRight;

  const incidentPath = `M ${incidentStart.x} ${incidentStart.y} L ${originX} ${originY}`;
  const reflectedPath = `M ${originX} ${originY} L ${reflectedEnd.x} ${reflectedEnd.y}`;

  const diffuseSpreads = [-32, -14, 0, 18, 36];
  const diffusePaths = diffuseSpreads.map((spread, index) => {
    const nextAngle = Math.max(4, Math.min(86, reflectionAngle + spread));
    const nextRad = degreesToRadians(nextAngle);
    const length = rayLength * (0.72 + index * 0.04);
    const endX = originX + Math.sin(nextRad) * length;
    const endY = originY - Math.cos(nextRad) * length;
    return `M ${originX} ${originY} L ${endX} ${endY}`;
  });

  const incidentArc = describeArc({
    centerX: originX,
    centerY: originY,
    radius: 60,
    startDeg: -90,
    endDeg: -90 - incidentAngle,
  });
  const reflectedArc = describeArc({
    centerX: originX,
    centerY: originY,
    radius: 60,
    startDeg: -90,
    endDeg: -90 + reflectionAngle,
  });

  const incidentLabel = polarPoint(originX, originY, 88, -90 - incidentAngle / 2);
  const reflectedLabel = polarPoint(originX, originY, 88, -90 + reflectionAngle / 2);

  const foldedBoardPath = `M ${originX + 4} ${originY - 4}
    L ${originX + 188} ${originY - 96}
    L ${originX + 214} ${originY - 70}
    L ${originX + 18} ${originY + 6} Z`;

  return {
    incidentPath,
    reflectedPath,
    diffusePaths,
    incidentArc,
    reflectedArc,
    incidentLabel,
    reflectedLabel,
    foldedBoardPath,
  };
}

function describeStepObservation({
  step,
  incidentAngle,
  foldAngle,
  reflectionMode,
  isReversed,
  isZh,
}: {
  step: ReflectionStepKey;
  incidentAngle: number;
  foldAngle: number;
  reflectionMode: ReflectionMode;
  isReversed: boolean;
  isZh: boolean;
}) {
  if (step === "equal-angle") {
    return isZh
      ? `把入射角调到 ${incidentAngle}° 后，反射角仍然保持 ${incidentAngle}°。`
      : `At ${incidentAngle}°, the reflected angle stays ${incidentAngle}° as well.`;
  }

  if (step === "coplanar") {
    return foldAngle <= 0
      ? (isZh
        ? "纸板还没有后折，反射光线和法线仍在纸板所在平面内。"
        : "The board is flat, so the rays still lie in the same plane.")
      : foldAngle < 18
        ? (isZh
          ? `纸板后折 ${foldAngle}° 后，反射光线在纸板上的痕迹开始变弱。`
          : `With a ${foldAngle}° fold, the reflected trace on the board starts fading.`)
        : (isZh
          ? `纸板后折 ${foldAngle}° 后，反射光线离开折起纸板，验证了三线共面。`
          : `With a ${foldAngle}° fold, the reflected ray leaves the folded board, proving coplanarity.`);
  }

  if (step === "reversible") {
    return isReversed
      ? (isZh
        ? "现在让光沿原反射路径逆向入射，光线会沿原来的入射路径返回。"
        : "Now the light enters along the reflected path and returns along the original incident path.")
      : (isZh
        ? "先看正向反射，再切换到逆向入射验证光路可逆。"
        : "Observe the forward reflection, then reverse it to verify path reversibility.");
  }

  return reflectionMode === "diffuse"
    ? (isZh
      ? "粗糙表面让反射光向各方向散射，但每个微小表面仍分别遵循反射定律。"
      : "The rough surface scatters the reflected light in many directions, though each micro-surface still obeys the law.")
    : (isZh
      ? "切换到漫反射模式后，再观察粗糙面上的散射效果。"
      : "Switch to diffuse mode and observe the scattered reflection.");
}

function buildRecordValue({
  step,
  incidentAngle,
  reflectionAngle,
  foldAngle,
  reflectionMode,
  isZh,
}: {
  step: ReflectionStepKey;
  incidentAngle: number;
  reflectionAngle: number;
  foldAngle: number;
  reflectionMode: ReflectionMode;
  isZh: boolean;
}) {
  if (step === "equal-angle") {
    return `i=${incidentAngle}° · r=${reflectionAngle}°`;
  }

  if (step === "coplanar") {
    return foldAngle >= 18
      ? (isZh ? `后折 ${foldAngle}°，反射光离开纸板` : `Fold ${foldAngle}°, ray leaves the board`)
      : (isZh ? `后折 ${foldAngle}°，仍可见反射光` : `Fold ${foldAngle}°, reflected ray still visible`);
  }

  if (step === "reversible") {
    return isZh ? "正反方向可重合" : "Forward and reverse paths overlap";
  }

  return reflectionMode === "diffuse"
    ? (isZh ? "散射各方向" : "Scattered directions")
    : (isZh ? "镜面反射" : "Specular reflection");
}

function buildRecordNote({
  step,
  incidentAngle,
  reflectionAngle,
  foldAngle,
  reflectionMode,
  isReversed,
  isZh,
}: {
  step: ReflectionStepKey;
  incidentAngle: number;
  reflectionAngle: number;
  foldAngle: number;
  reflectionMode: ReflectionMode;
  isReversed: boolean;
  isZh: boolean;
}) {
  if (step === "equal-angle") {
    return isZh
      ? `相对于法线测量：入射角 ${incidentAngle}°，反射角 ${reflectionAngle}°。`
      : `Measured from the normal: ${incidentAngle}° and ${reflectionAngle}°.`;
  }

  if (step === "coplanar") {
    return isZh
      ? `纸板后折 ${foldAngle}°；后折越明显，反射光线越难落在纸板上。`
      : `Fold angle ${foldAngle}°; the reflected ray leaves the folded board.`;
  }

  if (step === "reversible") {
    return isReversed
      ? (isZh ? "已切到逆向入射，光路沿原路径返回。" : "Reversed input returns along the original path.")
      : (isZh ? "保持正向入射，作为逆向验证的基线。" : "Forward entry used as the baseline for reversibility.");
  }

  return reflectionMode === "diffuse"
    ? (isZh ? "粗糙表面让反射光散射，但每个微观小面仍遵循反射定律。" : "Diffuse scattering still follows the law point by point.")
    : (isZh ? "当前仍是镜面反射模式。" : "Still in specular mode.");
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function polarPoint(centerX: number, centerY: number, radius: number, degrees: number) {
  const radians = degreesToRadians(degrees);
  return {
    x: centerX + Math.cos(radians) * radius,
    y: centerY + Math.sin(radians) * radius,
  };
}

function describeArc({
  centerX,
  centerY,
  radius,
  startDeg,
  endDeg,
}: {
  centerX: number;
  centerY: number;
  radius: number;
  startDeg: number;
  endDeg: number;
}) {
  const start = polarPoint(centerX, centerY, radius, startDeg);
  const end = polarPoint(centerX, centerY, radius, endDeg);
  const largeArcFlag = Math.abs(endDeg - startDeg) <= 180 ? 0 : 1;
  const sweepFlag = endDeg > startDeg ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
}

function clearObservationTimer(timerId: TimerId | null) {
  if (timerId !== null) {
    globalThis.clearInterval(timerId);
  }
}

function PanelChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {collapsed ? (
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M8 4H4v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 4h4v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 16v4h-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v4h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 9L4 4" strokeLinecap="round" />
      <path d="M15 9l5-5" strokeLinecap="round" />
      <path d="M9 15l-5 5" strokeLinecap="round" />
      <path d="M15 15l5 5" strokeLinecap="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 4H4v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 4h5v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v5h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9l5-5" strokeLinecap="round" />
      <path d="M20 9l-5-5" strokeLinecap="round" />
      <path d="M4 15l5 5" strokeLinecap="round" />
      <path d="M20 15l-5 5" strokeLinecap="round" />
    </svg>
  );
}
