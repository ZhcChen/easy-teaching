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

type TwoForceBalanceLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type StepKey =
  | "balanced"
  | "unequal"
  | "same-direction"
  | "not-collinear"
  | "different-objects";
type DirectionMode = "opposite" | "same";
type LineMode = "collinear" | "offset";
type ObjectMode = "same" | "separate";
type ObservationState = "idle" | "observing" | "stable";
type ResultMode =
  | "balanced"
  | "translate-left"
  | "translate-right"
  | "rotate"
  | "separate";
type TimerId = ReturnType<typeof setInterval>;

type BalanceParams = {
  leftForce: number;
  rightForce: number;
  directionMode: DirectionMode;
  lineMode: LineMode;
  objectMode: ObjectMode;
};

type StepPreset = {
  key: StepKey;
  stepLabel: string;
  label: string;
  summary: string;
  focus: string;
  params: BalanceParams;
};

type TeachingState = {
  isEqual: boolean;
  isOpposite: boolean;
  isCollinear: boolean;
  isSameObject: boolean;
  netForceX: number | null;
  resultMode: ResultMode;
  resultLabel: string;
  observation: string;
  formula: string;
  brokenConditions: string[];
};

type ConditionBadge = {
  key: string;
  label: string;
  satisfied: boolean;
};

type ClassroomRecord = {
  key: StepKey;
  value: string;
  note: string;
};

const PANEL_COLLAPSED_STORAGE_KEY = "easy-teaching.two-force-balance.panel-collapsed";
const OBSERVATION_TICK_MS = 40;
const OBSERVATION_DURATION_MS = 1180;
const STEP_SEQUENCE: StepKey[] = [
  "balanced",
  "unequal",
  "same-direction",
  "not-collinear",
  "different-objects",
];

const STEP_PRESETS: Record<StepKey, StepPreset> = {
  balanced: {
    key: "balanced",
    stepLabel: "1",
    label: "平衡基线",
    summary: "先建立四个条件同时满足时的标准平衡状态。",
    focus: "四个条件都满足，物体保持平衡。",
    params: {
      leftForce: 4,
      rightForce: 4,
      directionMode: "opposite",
      lineMode: "collinear",
      objectMode: "same",
    },
  },
  unequal: {
    key: "unequal",
    stepLabel: "2",
    label: "大小不等",
    summary: "先只破坏“大小相等”这一项，观察物体向力大的一侧运动。",
    focus: "只要大小不等，合力就不为 0。",
    params: {
      leftForce: 4,
      rightForce: 6,
      directionMode: "opposite",
      lineMode: "collinear",
      objectMode: "same",
    },
  },
  "same-direction": {
    key: "same-direction",
    stepLabel: "3",
    label: "方向不反向",
    summary: "再破坏“方向相反”，让两力同向，观察物体整体偏向同一方向。",
    focus: "方向不反向时，两力不能相互抵消。",
    params: {
      leftForce: 4,
      rightForce: 4,
      directionMode: "same",
      lineMode: "collinear",
      objectMode: "same",
    },
  },
  "not-collinear": {
    key: "not-collinear",
    stepLabel: "4",
    label: "不共线",
    summary: "保持大小相等、方向相反，但让作用线错开，观察转动趋势。",
    focus: "不共线时，即使大小相等，也会产生转动。",
    params: {
      leftForce: 4,
      rightForce: 4,
      directionMode: "opposite",
      lineMode: "offset",
      objectMode: "same",
    },
  },
  "different-objects": {
    key: "different-objects",
    stepLabel: "5",
    label: "不同物体",
    summary: "最后破坏“同一物体”，让两力分别作用在两个物体上。",
    focus: "不在同一物体上，就不能讨论同一个物体的二力平衡。",
    params: {
      leftForce: 4,
      rightForce: 4,
      directionMode: "opposite",
      lineMode: "collinear",
      objectMode: "separate",
    },
  },
};

const SVG_STAGE = {
  width: 1160,
  height: 760,
  panelX: 58,
  panelY: 82,
  panelWidth: 1044,
  panelHeight: 560,
  centerX: 580,
  centerY: 360,
  leftPulleyX: 250,
  rightPulleyX: 910,
  pulleyY: 182,
  weightTopY: 246,
  bodyWidth: 220,
  bodyHeight: 76,
};

export function TwoForceBalanceLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: TwoForceBalanceLabProps) {
  const { isZh, tt } = useLocale();
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  const [activeStep, setActiveStep] = useState<StepKey>("balanced");
  const [params, setParams] = useState<BalanceParams>(STEP_PRESETS.balanced.params);
  const [observationState, setObservationState] = useState<ObservationState>("idle");
  const [progress, setProgress] = useState(0);
  const [records, setRecords] = useState<Partial<Record<StepKey, ClassroomRecord>>>({});
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
  const teachingState = useMemo(
    () => deriveTeachingState({ params, isZh }),
    [isZh, params],
  );
  const conditionBadges = useMemo(
    () => buildConditionBadges({ params, teachingState, isZh }),
    [isZh, params, teachingState],
  );
  const stageMeta = useMemo(() => {
    if (observationState === "stable") {
      return {
        label: teachingState.resultMode === "balanced"
          ? (isZh ? "平衡成立" : "Balanced")
          : (isZh ? "现象稳定" : "Observation ready"),
        tone: teachingState.resultMode === "balanced" ? "balanced" as const : "warning" as const,
        copy: teachingState.observation,
      };
    }

    if (observationState === "observing") {
      return {
        label: isZh ? "验证中" : "Observing",
        tone: "active" as const,
        copy: teachingState.observation,
      };
    }

    return {
      label: isZh ? "待验证" : "Ready",
      tone: "warning" as const,
      copy: activePreset.summary,
    };
  }, [activePreset.summary, isZh, observationState, teachingState.observation, teachingState.resultMode]);

  const recordedCount = STEP_SEQUENCE.filter((key) => records[key]).length;
  const currentStepRecorded = Boolean(records[activeStep]);
  const isRecordEnabled = observationState === "stable";
  const primaryActionLabel = observationState === "observing"
    ? (isZh ? "验证中…" : "Observing…")
    : observationState === "stable"
      ? (isZh ? "重新验证" : "Replay")
      : (isZh ? "开始验证" : "Start");
  const recordButtonLabel = currentStepRecorded
    ? (isZh ? "更新本组" : "Update current run")
    : (isZh ? "记录本组" : "Record current run");

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
      key: "balance-validation",
      title: isZh ? "五组条件验证" : "Five classroom checks",
      countLabel: isZh ? `${recordedCount} / 5 组` : `${recordedCount} / 5 runs`,
      isActive: true,
      helper: isZh
        ? "先看平衡基线，再逐项破坏条件，理解为什么“四个条件缺一不可”。"
        : "Start from the balanced baseline, then break one condition at a time.",
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
            ? "课堂结论：只有当两个力作用在同一物体上、大小相等、方向相反、并且在同一直线上时，物体才处于二力平衡。"
            : "Conclusion: only when both forces act on the same object, are equal, opposite, and collinear, can two-force balance exist.")
          : undefined,
    },
  ];

  const scene = useMemo(
    () => buildScene({ params, progress, teachingState }),
    [params, progress, teachingState],
  );

  const summaryChips = useMemo(
    () => {
      const brokenCopy = teachingState.brokenConditions.length === 0
        ? (isZh ? "无" : "None")
        : teachingState.brokenConditions.join("、");

      return [
        {
          label: isZh ? "当前结果" : "Result",
          value: teachingState.resultLabel,
        },
        {
          label: isZh ? "破坏条件" : "Broken condition",
          value: brokenCopy,
        },
      ];
    },
    [isZh, teachingState.brokenConditions, teachingState.resultLabel],
  );

  function invalidateObservation() {
    clearObservationTimer(timerRef.current);
    timerRef.current = null;
    setObservationState("idle");
    setProgress(0);
  }

  function updateParams(nextParams: Partial<BalanceParams>) {
    setParams((previous) => ({
      ...previous,
      ...nextParams,
    }));
    invalidateObservation();
  }

  function applyPreset(key: StepKey) {
    setActiveStep(key);
    setParams(STEP_PRESETS[key].params);
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
        value: teachingState.resultLabel,
        note: buildRecordNote({
          params,
          teachingState,
          isZh,
        }),
      },
    };

    setRecords(nextRecords);

    const nextPendingStep = STEP_SEQUENCE.find((key) => !nextRecords[key]);
    if (nextPendingStep) {
      applyPreset(nextPendingStep);
    }
  }

  function resetLab() {
    clearObservationTimer(timerRef.current);
    timerRef.current = null;
    setActiveStep("balanced");
    setParams(STEP_PRESETS.balanced.params);
    setObservationState("idle");
    setProgress(0);
    setRecords({});
  }

  return (
    <section ref={fullscreenRef} className="visual-shell force-lab-shell balance-lab-shell">
      <div
        className={
          isControlPanelCollapsed
            ? "force-lab-layout balance-lab-layout is-collapsed"
            : "force-lab-layout balance-lab-layout"
        }
      >
        <aside
          className={
            isControlPanelCollapsed
              ? "force-control-panel balance-control-panel is-collapsed"
              : "force-control-panel balance-control-panel"
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

              <div className="force-control-scroll balance-control-scroll">
                <ControlPanelSection
                  title={isZh ? "课堂主流程" : "Classroom Flow"}
                  hint={isZh ? "先建立平衡基线，再逐项破坏条件" : "Start from the baseline and break one condition at a time"}
                  accent
                >
                  <ControlStatusBar
                    items={[
                      <StatusPill key="step">{tt(activePreset.label)}</StatusPill>,
                      <StatusPill key="record">{isZh ? `${recordedCount} / 5 已记录` : `${recordedCount} / 5 recorded`}</StatusPill>,
                    ]}
                    status={<StatusPill tone={stageMeta.tone}>{stageMeta.label}</StatusPill>}
                  />
                  <p className="force-inline-copy">{tt(activePreset.summary)}</p>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "核心参数" : "Core Variables"}
                  hint={isZh ? "改变参数后需重新验证" : "Changing parameters requires a new observation"}
                >
                  <ControlRange
                    id="balance-left-force"
                    label={isZh ? "左侧拉力 F1" : "Left force F1"}
                    min={0}
                    max={10}
                    step={0.5}
                    unit="N"
                    value={params.leftForce}
                    editable
                    onChange={(value) => updateParams({ leftForce: value })}
                  />
                  <ControlRange
                    id="balance-right-force"
                    label={isZh ? "右侧拉力 F2" : "Right force F2"}
                    min={0}
                    max={10}
                    step={0.5}
                    unit="N"
                    value={params.rightForce}
                    editable
                    onChange={(value) => updateParams({ rightForce: value })}
                  />
                  <div className="pressure-inline-lock-grid">
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "方向条件" : "Direction"}</span>
                      <strong className="force-insight-value">
                        {params.directionMode === "opposite"
                          ? tt("方向相反")
                          : tt("方向同向")}
                      </strong>
                    </article>
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "作用线" : "Line"}</span>
                      <strong className="force-insight-value">
                        {params.lineMode === "collinear"
                          ? tt("同一直线")
                          : tt("不共线")}
                      </strong>
                    </article>
                  </div>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "条件切换" : "Condition Switches"}
                  hint={isZh ? "课堂上通常每次只破坏一个条件" : "Usually break one condition at a time"}
                >
                  <ControlChipGroup
                    items={[
                      {
                        key: "opposite",
                        label: tt("方向相反"),
                        active: params.directionMode === "opposite",
                        onClick: () => updateParams({ directionMode: "opposite" }),
                      },
                      {
                        key: "same",
                        label: tt("方向同向"),
                        active: params.directionMode === "same",
                        onClick: () => updateParams({ directionMode: "same" }),
                      },
                    ]}
                    columns={2}
                    size="dense"
                  />
                  <ControlChipGroup
                    items={[
                      {
                        key: "collinear",
                        label: tt("同一直线"),
                        active: params.lineMode === "collinear",
                        onClick: () => updateParams({ lineMode: "collinear" }),
                      },
                      {
                        key: "offset",
                        label: tt("不共线"),
                        active: params.lineMode === "offset",
                        onClick: () => updateParams({ lineMode: "offset" }),
                      },
                    ]}
                    columns={2}
                    size="dense"
                  />
                  <ControlChipGroup
                    items={[
                      {
                        key: "same-object",
                        label: tt("同一物体"),
                        active: params.objectMode === "same",
                        onClick: () => updateParams({ objectMode: "same" }),
                      },
                      {
                        key: "different-objects",
                        label: tt("不同物体"),
                        active: params.objectMode === "separate",
                        onClick: () => updateParams({ objectMode: "separate" }),
                      },
                    ]}
                    columns={2}
                    size="dense"
                  />
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "操作与记录" : "Observe & Record"}
                  hint={isZh ? "稳定后再记录本组现象" : "Record only after the observation stabilizes"}
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
                  <p className="force-inline-copy">{tt(teachingState.formula)}</p>

                  <BasicForceRecordTable
                    groups={recordGroups}
                    emptyTitle={isZh ? "先完成第一组验证" : "Finish the first check"}
                    emptyCopy={
                      isZh
                        ? "这张课堂记录单会保留五组验证过程，方便最后归纳“四个条件缺一不可”。"
                        : "The worksheet keeps the five validation runs for the final classroom conclusion."
                    }
                    pendingCopy={isZh ? "待测" : "Pending"}
                  />
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "思考提示" : "Think Prompt"}
                  hint={isZh ? "帮助区分二力平衡与相互作用力" : "Help separate balance from interaction pairs"}
                >
                  <ul className="force-support-question-list">
                    <li>{isZh ? "为什么“同一物体”这个条件最容易被忽略？" : "Why is the 'same object' condition easy to miss?"}</li>
                    <li>{isZh ? "如果只满足其中三个条件，物体会出现什么现象？" : "What happens if only three conditions are satisfied?"}</li>
                    <li>{isZh ? "二力平衡和相互作用力，最大的区别是什么？" : "What is the main difference between balance and an interaction pair?"}</li>
                  </ul>
                </ControlPanelSection>
              </div>
            </>
          )}
        </aside>

        <div className="force-lab-main balance-lab-main">
          <div className="force-toolbar">
            <div className="force-toolbar-status">
              <StatusPill tone="active">{tt("二力平衡")}</StatusPill>
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

          <div className="visual-canvas force-stage-canvas balance-stage-canvas is-2d-mode">
            <ControlStepGroup
              className="force-stage-overlay is-top-center force-stage-stepbar balance-stage-stepbar"
              items={stepItems}
            />
            <div className="visual-grid-layer" />
            <div className="visual-glow visual-glow-a" />
            <div className="visual-glow visual-glow-b" />

            <div className="force-stage-overlay is-top-left">
              <div className="force-stage-hud-card">
                <div className="force-stage-hud-head">
                  <span className="force-stage-hud-title">{tt("四个条件检查")}</span>
                  <StatusPill tone={stageMeta.tone}>{stageMeta.label}</StatusPill>
                </div>
                <div className="balance-stage-condition-grid">
                  {conditionBadges.map((item) => (
                    <span
                      key={item.key}
                      className={
                        item.satisfied
                          ? "balance-stage-condition-chip is-ok"
                          : "balance-stage-condition-chip is-bad"
                      }
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
                <p className="pressure-stage-copy">{tt(activePreset.focus)}</p>
              </div>
            </div>

            <div className="force-stage-overlay is-bottom-left">
              <div className="force-stage-hud-card is-tight">
                <div className="force-stage-hud-head">
                  <span className="force-stage-hud-title">{isZh ? "实时读数" : "Live Reading"}</span>
                </div>
                <div className="pressure-stage-metric-grid">
                  <article className="force-stage-result-pill">
                    <strong>{params.leftForce.toFixed(1).replace(/\.0$/, "")} N</strong>
                    <span>F1</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{params.rightForce.toFixed(1).replace(/\.0$/, "")} N</strong>
                    <span>F2</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>
                      {teachingState.netForceX === null
                        ? tt("不可合成")
                        : `${Math.abs(teachingState.netForceX).toFixed(1).replace(/\.0$/, "")} N`}
                    </strong>
                    <span>{isZh ? "合力大小" : "Net force"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{tt(teachingState.resultLabel)}</strong>
                    <span>{isZh ? "现象判断" : "Observation"}</span>
                  </article>
                </div>
                <p className="pressure-stage-formula">{tt(teachingState.formula)}</p>
              </div>
            </div>

            <div className="force-stage-overlay is-bottom-right">
              <div className="force-stage-hud-card is-tight balance-stage-summary-card">
                <div className="force-stage-hud-head">
                  <span className="force-stage-hud-title">{isZh ? "课堂判断" : "Classroom Summary"}</span>
                  <span className="force-stage-chip">{isZh ? `${recordedCount} / 5` : `${recordedCount} / 5`}</span>
                </div>
                <div className="balance-stage-summary-grid">
                  {summaryChips.map((item) => (
                    <article key={item.label} className="balance-stage-summary-item">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${SVG_STAGE.width} ${SVG_STAGE.height}`}
              className="force-stage-svg balance-stage-svg"
              role="img"
              aria-label={isZh ? `${tt(topic.title)}可视化示意图` : `${tt(topic.title)} visualization`}
            >
              <defs>
                <marker id="balance-arrow-blue" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto">
                  <path d="M0,0 L12,6 L0,12 z" fill="#60a5fa" />
                </marker>
                <marker id="balance-arrow-purple" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto">
                  <path d="M0,0 L12,6 L0,12 z" fill="#c084fc" />
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
                {tt("双滑轮受力场景")}
              </text>
              <text x={SVG_STAGE.panelX + 34} y={SVG_STAGE.panelY + 54} className="motion-stage-panel-copy">
                {tt("看拉力箭头、作用线和研究对象，判断是否满足二力平衡。")}
              </text>

              <line x1="120" y1="438" x2="1040" y2="438" className="balance-stage-table-line" />

              <g>
                <circle cx={SVG_STAGE.leftPulleyX} cy={SVG_STAGE.pulleyY} r="26" className="balance-stage-pulley" />
                <circle cx={SVG_STAGE.rightPulleyX} cy={SVG_STAGE.pulleyY} r="26" className="balance-stage-pulley" />
              </g>

              <g>
                <line
                  x1={SVG_STAGE.leftPulleyX}
                  y1={SVG_STAGE.pulleyY}
                  x2={scene.leftAnchor.x}
                  y2={scene.leftAnchor.y}
                  className="balance-stage-rope"
                />
                <line
                  x1={SVG_STAGE.rightPulleyX}
                  y1={SVG_STAGE.pulleyY}
                  x2={scene.rightAnchor.x}
                  y2={scene.rightAnchor.y}
                  className="balance-stage-rope"
                />
                <line
                  x1={SVG_STAGE.leftPulleyX}
                  y1={SVG_STAGE.pulleyY}
                  x2={SVG_STAGE.leftPulleyX}
                  y2={SVG_STAGE.weightTopY}
                  className="balance-stage-rope"
                />
                <line
                  x1={SVG_STAGE.rightPulleyX}
                  y1={SVG_STAGE.pulleyY}
                  x2={SVG_STAGE.rightPulleyX}
                  y2={SVG_STAGE.weightTopY}
                  className="balance-stage-rope"
                />
                <rect
                  x={SVG_STAGE.leftPulleyX - 24}
                  y={SVG_STAGE.weightTopY}
                  width="48"
                  height={34 + params.leftForce * 4}
                  rx="12"
                  className="balance-stage-weight"
                />
                <rect
                  x={SVG_STAGE.rightPulleyX - 24}
                  y={SVG_STAGE.weightTopY}
                  width="48"
                  height={34 + params.rightForce * 4}
                  rx="12"
                  className="balance-stage-weight"
                />
                <text x={SVG_STAGE.leftPulleyX} y={SVG_STAGE.weightTopY + 24} textAnchor="middle" className="motion-stage-ruler-label">
                  F1
                </text>
                <text x={SVG_STAGE.rightPulleyX} y={SVG_STAGE.weightTopY + 24} textAnchor="middle" className="motion-stage-ruler-label">
                  F2
                </text>
              </g>

              {params.objectMode === "same" ? (
                <g
                  transform={`translate(${scene.sameBodyX}, 0) rotate(${scene.sameBodyRotation} ${SVG_STAGE.centerX} ${SVG_STAGE.centerY})`}
                >
                  <rect
                    x={SVG_STAGE.centerX - SVG_STAGE.bodyWidth / 2}
                    y={SVG_STAGE.centerY - SVG_STAGE.bodyHeight / 2}
                    width={SVG_STAGE.bodyWidth}
                    height={SVG_STAGE.bodyHeight}
                    rx="26"
                    className="balance-stage-body"
                  />
                  <rect
                    x={SVG_STAGE.centerX - 74}
                    y={SVG_STAGE.centerY - 18}
                    width="148"
                    height="36"
                    rx="18"
                    className="balance-stage-body-core"
                  />
                  <circle cx={scene.leftAnchor.x} cy={scene.leftAnchor.y} r="6" className="balance-stage-anchor" />
                  <circle cx={scene.rightAnchor.x} cy={scene.rightAnchor.y} r="6" className="balance-stage-anchor" />
                </g>
              ) : (
                <>
                  <g transform={`translate(${scene.leftBodyX}, 0)`}>
                    <rect
                      x={SVG_STAGE.centerX - 214}
                      y={SVG_STAGE.centerY - 32}
                      width="150"
                      height="64"
                      rx="22"
                      className="balance-stage-body balance-stage-body-secondary"
                    />
                    <circle cx={scene.leftAnchor.x} cy={scene.leftAnchor.y} r="6" className="balance-stage-anchor" />
                  </g>
                  <g transform={`translate(${scene.rightBodyX}, 0)`}>
                    <rect
                      x={SVG_STAGE.centerX + 64}
                      y={SVG_STAGE.centerY - 32}
                      width="150"
                      height="64"
                      rx="22"
                      className="balance-stage-body balance-stage-body-secondary"
                    />
                    <circle cx={scene.rightAnchor.x} cy={scene.rightAnchor.y} r="6" className="balance-stage-anchor" />
                  </g>
                </>
              )}

              <line
                x1={scene.leftArrow.startX}
                y1={scene.leftArrow.startY}
                x2={scene.leftArrow.endX}
                y2={scene.leftArrow.endY}
                className="balance-stage-force-arrow"
                markerEnd="url(#balance-arrow-blue)"
              />
              <line
                x1={scene.rightArrow.startX}
                y1={scene.rightArrow.startY}
                x2={scene.rightArrow.endX}
                y2={scene.rightArrow.endY}
                className="balance-stage-force-arrow"
                markerEnd="url(#balance-arrow-blue)"
              />

              <text x={scene.leftArrow.labelX} y={scene.leftArrow.labelY} textAnchor="middle" className="motion-stage-value-callout">
                {`F1 = ${params.leftForce.toFixed(1).replace(/\.0$/, "")} N`}
              </text>
              <text x={scene.rightArrow.labelX} y={scene.rightArrow.labelY} textAnchor="middle" className="motion-stage-value-callout">
                {`F2 = ${params.rightForce.toFixed(1).replace(/\.0$/, "")} N`}
              </text>

              {scene.netArrow ? (
                <>
                  <line
                    x1={scene.netArrow.startX}
                    y1={scene.netArrow.startY}
                    x2={scene.netArrow.endX}
                    y2={scene.netArrow.endY}
                    className="balance-stage-net-arrow"
                    markerEnd="url(#balance-arrow-purple)"
                  />
                  <text x={scene.netArrow.labelX} y={scene.netArrow.labelY} textAnchor="middle" className="motion-stage-value-callout">
                    {scene.netArrow.label}
                  </text>
                </>
              ) : null}

              {scene.rotationArc ? (
                <>
                  <path d={scene.rotationArc.path} className="balance-stage-rotation-arc" />
                  <text x={scene.rotationArc.labelX} y={scene.rotationArc.labelY} className="motion-stage-value-callout">
                    {scene.rotationArc.label}
                  </text>
                </>
              ) : null}

              <text x={SVG_STAGE.panelX + 34} y={SVG_STAGE.panelY + 464} className="motion-stage-panel-title">
                {tt("当前判断")}
              </text>
              <text x={SVG_STAGE.panelX + 34} y={SVG_STAGE.panelY + 494} className="pressure-stage-label">
                {tt(teachingState.observation)}
              </text>
              <text x={SVG_STAGE.panelX + 34} y={SVG_STAGE.panelY + 526} className="pressure-stage-value">
                {tt(teachingState.formula)}
              </text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

function buildConditionBadges({
  params,
  teachingState,
  isZh,
}: {
  params: BalanceParams;
  teachingState: TeachingState;
  isZh: boolean;
}): ConditionBadge[] {
  return [
    {
      key: "same-object",
      label: isZh ? "同一物体" : "Same object",
      satisfied: params.objectMode === "same",
    },
    {
      key: "equal",
      label: isZh ? "大小相等" : "Equal force",
      satisfied: teachingState.isEqual,
    },
    {
      key: "opposite",
      label: isZh ? "方向相反" : "Opposite",
      satisfied: teachingState.isOpposite,
    },
    {
      key: "collinear",
      label: isZh ? "同一直线" : "Collinear",
      satisfied: teachingState.isCollinear,
    },
  ];
}

function deriveTeachingState({
  params,
  isZh,
}: {
  params: BalanceParams;
  isZh: boolean;
}): TeachingState {
  const isEqual = Math.abs(params.leftForce - params.rightForce) < 0.05;
  const isOpposite = params.directionMode === "opposite";
  const isCollinear = params.lineMode === "collinear";
  const isSameObject = params.objectMode === "same";

  const netForceX = !isSameObject
    ? null
    : isOpposite
      ? params.rightForce - params.leftForce
      : -(params.leftForce + params.rightForce);

  const brokenConditions: string[] = [];

  if (!isSameObject) {
    brokenConditions.push(isZh ? "不同物体" : "Different objects");
  }

  if (!isEqual) {
    brokenConditions.push(isZh ? "大小不等" : "Unequal force");
  }

  if (!isOpposite) {
    brokenConditions.push(isZh ? "方向不反向" : "Not opposite");
  }

  if (!isCollinear) {
    brokenConditions.push(isZh ? "不共线" : "Not collinear");
  }

  if (isSameObject && isEqual && isOpposite && isCollinear) {
    return {
      isEqual,
      isOpposite,
      isCollinear,
      isSameObject,
      netForceX: 0,
      resultMode: "balanced",
      resultLabel: isZh ? "保持平衡" : "Balanced",
      observation: isZh
        ? "四个条件同时满足，合力为 0，物体保持静止或匀速直线运动。"
        : "All four conditions are satisfied, so the net force is zero.",
      formula: "F合 = 0",
      brokenConditions,
    };
  }

  if (!isSameObject) {
    return {
      isEqual,
      isOpposite,
      isCollinear,
      isSameObject,
      netForceX,
      resultMode: "separate",
      resultLabel: isZh ? "分别运动" : "Separate motion",
      observation: isZh
        ? "两力分别作用在两个物体上，不能用来讨论同一个物体的二力平衡。"
        : "The two forces act on different objects, so this is not two-force balance.",
      formula: isZh ? "研究对象不同，不能合成为同一物体的平衡" : "Different objects -> not a balance case",
      brokenConditions,
    };
  }

  if (!isCollinear) {
    return {
      isEqual,
      isOpposite,
      isCollinear,
      isSameObject,
      netForceX,
      resultMode: "rotate",
      resultLabel: isZh ? "发生转动" : "Rotates",
      observation: isZh
        ? "虽然大小相等、方向相反，但两力不在同一直线上，会产生转动趋势。"
        : "Equal and opposite is not enough if the two lines are not collinear.",
      formula: isZh ? "合力可近似为 0，但力矩 ≠ 0" : "Net force ~ 0, but torque ≠ 0",
      brokenConditions,
    };
  }

  if (!isOpposite) {
    return {
      isEqual,
      isOpposite,
      isCollinear,
      isSameObject,
      netForceX,
      resultMode: "translate-left",
      resultLabel: isZh ? "向左运动" : "Moves left",
      observation: isZh
        ? "两力同向时会叠加，物体整体向同一方向运动。"
        : "When the two forces point the same way, they add instead of cancel.",
      formula: `F合 = ${formatForceValue(params.leftForce + params.rightForce)} N`,
      brokenConditions,
    };
  }

  if ((netForceX ?? 0) >= 0) {
    return {
      isEqual,
      isOpposite,
      isCollinear,
      isSameObject,
      netForceX,
      resultMode: "translate-right",
      resultLabel: isZh ? "向右运动" : "Moves right",
      observation: isZh
        ? "两力方向相反、共线且作用于同一物体，但大小不等，所以物体向力大的一侧运动。"
        : "Opposite and collinear is not enough if the magnitudes are different.",
      formula: `F合 = ${formatForceValue(Math.abs(netForceX ?? 0))} N`,
      brokenConditions,
    };
  }

  return {
    isEqual,
    isOpposite,
    isCollinear,
    isSameObject,
    netForceX,
    resultMode: "translate-left",
    resultLabel: isZh ? "向左运动" : "Moves left",
    observation: isZh
      ? "两力方向相反、共线且作用于同一物体，但大小不等，所以物体向力大的一侧运动。"
      : "Opposite and collinear is not enough if the magnitudes are different.",
    formula: `F合 = ${formatForceValue(Math.abs(netForceX ?? 0))} N`,
    brokenConditions,
  };
}

function buildRecordNote({
  params,
  teachingState,
  isZh,
}: {
  params: BalanceParams;
  teachingState: TeachingState;
  isZh: boolean;
}) {
  const brokenCopy = teachingState.brokenConditions.length === 0
    ? (isZh ? "四个条件全部满足" : "All conditions satisfied")
    : teachingState.brokenConditions.join("、");

  return isZh
    ? `F1 ${formatForceValue(params.leftForce)} N · F2 ${formatForceValue(params.rightForce)} N · ${brokenCopy}`
    : `F1 ${formatForceValue(params.leftForce)} N · F2 ${formatForceValue(params.rightForce)} N · ${brokenCopy}`;
}

function buildScene({
  params,
  progress,
  teachingState,
}: {
  params: BalanceParams;
  progress: number;
  teachingState: TeachingState;
}) {
  const bodyShiftX =
    teachingState.resultMode === "translate-right"
      ? 96 * progress
      : teachingState.resultMode === "translate-left"
        ? -96 * progress
        : 0;
  const sameBodyRotation =
    teachingState.resultMode === "rotate" ? -18 * progress : 0;
  const leftBodyX =
    teachingState.resultMode === "separate" ? -72 * progress : 0;
  const rightBodyX =
    teachingState.resultMode === "separate" ? 72 * progress : 0;

  const sameBodyCenterX = SVG_STAGE.centerX + bodyShiftX;
  const sameBodyCenterY = SVG_STAGE.centerY;
  const sharedAnchorYOffset = params.lineMode === "offset" ? -34 : 0;

  const leftAnchor = params.objectMode === "same"
    ? {
      x: sameBodyCenterX - 98,
      y: sameBodyCenterY,
    }
    : {
      x: SVG_STAGE.centerX - 140 + leftBodyX,
      y: SVG_STAGE.centerY,
    };

  const rightAnchor = params.objectMode === "same"
    ? {
      x: sameBodyCenterX + 98,
      y: sameBodyCenterY + sharedAnchorYOffset,
    }
    : {
      x: SVG_STAGE.centerX + 140 + rightBodyX,
      y: SVG_STAGE.centerY,
    };

  const leftArrowLength = 48 + params.leftForce * 11;
  const rightArrowLength = 48 + params.rightForce * 11;
  const rightArrowDirection = params.directionMode === "opposite" ? 1 : -1;

  const leftArrow = {
    startX: leftAnchor.x,
    startY: leftAnchor.y,
    endX: leftAnchor.x - leftArrowLength,
    endY: leftAnchor.y,
    labelX: leftAnchor.x - leftArrowLength / 2,
    labelY: leftAnchor.y - 24,
  };

  const rightArrow = {
    startX: rightAnchor.x,
    startY: rightAnchor.y,
    endX: rightAnchor.x + rightArrowLength * rightArrowDirection,
    endY: rightAnchor.y,
    labelX: rightAnchor.x + (rightArrowLength * rightArrowDirection) / 2,
    labelY: rightAnchor.y - 24,
  };

  const netArrow = teachingState.resultMode === "translate-right"
    ? {
      startX: sameBodyCenterX,
      startY: sameBodyCenterY + 72,
      endX: sameBodyCenterX + 80,
      endY: sameBodyCenterY + 72,
      labelX: sameBodyCenterX + 42,
      labelY: sameBodyCenterY + 102,
      label: `F合 ${formatForceValue(Math.abs(teachingState.netForceX ?? 0))} N`,
    }
    : teachingState.resultMode === "translate-left"
      ? {
        startX: sameBodyCenterX,
        startY: sameBodyCenterY + 72,
        endX: sameBodyCenterX - 80,
        endY: sameBodyCenterY + 72,
        labelX: sameBodyCenterX - 42,
        labelY: sameBodyCenterY + 102,
        label: `F合 ${formatForceValue(Math.abs(teachingState.netForceX ?? 0))} N`,
      }
      : null;

  const rotationArc = teachingState.resultMode === "rotate"
    ? {
      path: `M ${SVG_STAGE.centerX - 54} ${SVG_STAGE.centerY - 84} A 72 72 0 0 1 ${SVG_STAGE.centerX + 52} ${SVG_STAGE.centerY - 84}`,
      labelX: SVG_STAGE.centerX - 10,
      labelY: SVG_STAGE.centerY - 112,
      label: "转动趋势",
    }
    : null;

  return {
    sameBodyX: bodyShiftX,
    sameBodyRotation,
    leftBodyX,
    rightBodyX,
    leftAnchor,
    rightAnchor,
    leftArrow,
    rightArrow,
    netArrow,
    rotationArc,
  };
}

function clearObservationTimer(timerId: TimerId | null) {
  if (timerId !== null) {
    globalThis.clearInterval(timerId);
  }
}

function formatForceValue(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
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
