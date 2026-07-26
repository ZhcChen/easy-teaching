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
import { NewtonFirstLawThreeStage } from "./newton-first-law-three-stage";
import {
  DEFAULT_MOTION_CART_SCALE,
  MotionCartAsset,
} from "./motion-cart-asset";
import { StatusPill } from "./status-pill";
import { VisualModeSwitch } from "./visual-mode-switch";

type NewtonFirstLawLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type SurfaceKey = "towel" | "cotton" | "board" | "ideal";
type ObservationState = "idle" | "observing" | "stable";
type NewtonViewMode = "2d" | "3d";
type TimerId = ReturnType<typeof setInterval>;

type SurfacePreset = {
  key: SurfaceKey;
  label: string;
  shortLabel: string;
  resistanceLabel: string;
  description: string;
  deceleration: number;
  animationDurationMs: number;
  colorClass: string;
  accent: string;
  note: string;
};

type SurfaceScenario = SurfacePreset & {
  initialVelocity: number;
  distanceMeters: number;
  stopTimeSeconds: number | null;
  physicalDurationSeconds: number;
  isIdeal: boolean;
};

type MotionPoint = {
  time: number;
  position: number;
  velocity: number;
  hasStopped: boolean;
};

type SurfaceRecord = {
  key: string;
  label: string;
  value: string;
  note: string;
};

const PANEL_COLLAPSED_STORAGE_KEY = "easy-teaching.newton-first-law.panel-collapsed";
const VIEW_MODE_STORAGE_KEY = "easy-teaching.newton-first-law.view-mode";
const PLAYBACK_TICK_MS = 40;
const DEFAULT_INITIAL_VELOCITY = 1.6;
const IDEAL_PREVIEW_SECONDS = 2.8;
const GRAPH_SAMPLE_COUNT = 64;
const SURFACE_SEQUENCE: SurfaceKey[] = ["towel", "cotton", "board", "ideal"];
const NEWTON_VIEW_OPTIONS: ReadonlyArray<{
  key: NewtonViewMode;
  label: string;
  title: string;
}> = [
  {
    key: "2d",
    label: "2D",
    title: "2D 解析视图",
  },
  {
    key: "3d",
    label: "3D",
    title: "3D 斜面跟随视图",
  },
];

const SURFACE_PRESETS: Record<SurfaceKey, SurfacePreset> = {
  towel: {
    key: "towel",
    label: "毛巾面",
    shortLabel: "毛巾",
    resistanceLabel: "阻力大",
    description: "阻力最大，小车会很快停下。",
    deceleration: 8.5,
    animationDurationMs: 1500,
    colorClass: "is-towel",
    accent: "#ff8b7b",
    note: "滑行最短，减速最快。",
  },
  cotton: {
    key: "cotton",
    label: "棉布面",
    shortLabel: "棉布",
    resistanceLabel: "阻力中",
    description: "阻力减小，小车滑得更远。",
    deceleration: 3.65,
    animationDurationMs: 2100,
    colorClass: "is-cotton",
    accent: "#ffbf67",
    note: "滑行距离和停止时间都明显增加。",
  },
  board: {
    key: "board",
    label: "木板面",
    shortLabel: "木板",
    resistanceLabel: "阻力小",
    description: "阻力更小，小车滑得最远。",
    deceleration: 1.6,
    animationDurationMs: 2800,
    colorClass: "is-board",
    accent: "#5de2b1",
    note: "最接近理想情况，但仍会慢慢停下。",
  },
  ideal: {
    key: "ideal",
    label: "理想光滑面",
    shortLabel: "理想面",
    resistanceLabel: "阻力为 0",
    description: "这是理想推理：若没有阻力，小车将保持匀速。",
    deceleration: 0,
    animationDurationMs: 2800,
    colorClass: "is-ideal",
    accent: "#67c6ff",
    note: "这里只做理想推理，不会真正停下。",
  },
};

const SVG_STAGE = {
  width: 1320,
  height: 820,
  trackPanelX: 72,
  trackPanelY: 82,
  trackPanelWidth: 1176,
  trackPanelHeight: 260,
  graphPanelX: 72,
  graphPanelY: 380,
  graphPanelWidth: 1176,
  graphPanelHeight: 310,
  trackStartX: 360,
  trackEndX: 1160,
  trackY: 246,
  rampStartX: 220,
  rampTopY: 160,
  rampEndX: 348,
};

export function NewtonFirstLawLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: NewtonFirstLawLabProps) {
  const { isZh, tt } = useLocale();
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<NewtonViewMode>(readStoredNewtonViewMode);
  const [initialVelocity, setInitialVelocity] = useState(DEFAULT_INITIAL_VELOCITY);
  const [surfaceKey, setSurfaceKey] = useState<SurfaceKey>("towel");
  const [observationState, setObservationState] = useState<ObservationState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [records, setRecords] = useState<Record<string, SurfaceRecord>>({});
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
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    return () => {
      clearPlaybackTimer(timerRef.current);
    };
  }, []);

  const currentScenario = useMemo(
    () => buildScenario(surfaceKey, initialVelocity),
    [initialVelocity, surfaceKey],
  );
  const comparisonScenarios = useMemo(
    () => SURFACE_SEQUENCE.map((key) => buildScenario(key, initialVelocity)),
    [initialVelocity],
  );
  const currentMotion = useMemo(
    () => resolveMotionPoint(currentScenario, currentTime),
    [currentScenario, currentTime],
  );
  const motionSeries = useMemo(
    () => buildMotionSeries(currentScenario),
    [currentScenario],
  );
  const trackDistanceDomain = useMemo(
    () =>
      Math.max(
        1.2,
        ...comparisonScenarios.map((scenario) =>
          scenario.isIdeal
            ? scenario.distanceMeters
            : Math.max(scenario.distanceMeters, 0.18),
        ),
      ) * 1.06,
    [comparisonScenarios],
  );
  const graphVelocityDomain = Math.max(0.8, initialVelocity * 1.08);
  const currentSurfaceRecorded = Boolean(records[surfaceKey]);
  const recordedCount = Object.keys(records).length;
  const isRecordEnabled = observationState === "stable";
  const nextPendingSurfaceKey =
    SURFACE_SEQUENCE.find((key) => !records[key]) ?? null;
  const finalConclusion =
    recordedCount === SURFACE_SEQUENCE.length
      ? (
        isZh
          ? "课堂结论：阻力越小，小车滑行越远；当阻力趋近 0 时，小车将保持匀速直线运动。"
          : "Conclusion: less resistance means longer travel; with nearly zero resistance, the cart keeps uniform motion."
      )
      : null;

  const stageStateMeta = useMemo(() => {
    if (observationState === "stable") {
      return {
        label: currentScenario.isIdeal
          ? (isZh ? "理想推理完成" : "Ideal inference complete")
          : (isZh ? "本次滑行完成" : "Run complete"),
        tone: "balanced" as const,
      };
    }

    if (observationState === "observing") {
      return {
        label: isZh ? "滑行中" : "Running",
        tone: "active" as const,
      };
    }

    return {
      label: isZh ? "待释放" : "Ready",
      tone: "warning" as const,
    };
  }, [currentScenario.isIdeal, isZh, observationState]);

  const comparisonRows = useMemo(
    () =>
      comparisonScenarios.map((scenario) => {
        const recorded = records[scenario.key];
        const maxDistance = Math.max(
          ...comparisonScenarios.map((item) => item.distanceMeters),
          0.0001,
        );

        return {
          key: scenario.key,
          label: isZh ? scenario.shortLabel : scenario.shortLabel,
          valueLabel: recorded
            ? recorded.value
            : scenario.isIdeal
              ? (isZh ? "继续前进" : "Keeps moving")
              : formatDistance(scenario.distanceMeters),
          percent: scenario.isIdeal
            ? 100
            : Math.max(10, (scenario.distanceMeters / maxDistance) * 100),
          active: surfaceKey === scenario.key,
        };
      }),
    [comparisonScenarios, isZh, records, surfaceKey],
  );

  const recordGroups = useMemo(
    () => [
      {
        key: "surface",
        title: isZh ? "实验记录单" : "Experiment Worksheet",
        countLabel: isZh ? `${recordedCount} / 4 组` : `${recordedCount} / 4 runs`,
        isActive: true,
        helper: isZh
          ? "保持同一初速度，只改变阻力面，依次补完四组对照。"
          : "Keep the same starting speed and complete the four resistance runs in order.",
        rows: SURFACE_SEQUENCE.map((key) => {
          const scenario = comparisonScenarios.find((item) => item.key === key) ?? buildScenario(key, initialVelocity);
          const record = records[key];
          return {
            key,
            label: tt(SURFACE_PRESETS[key].label),
            value: record?.value ?? "",
            note: record?.note
              ?? (scenario.isIdeal
                ? (isZh ? "理想推理：速度保持不变" : "Ideal inference: speed stays constant")
                : (isZh ? "保持同一初速度释放" : "Release from the same starting speed")),
            isPending: !record,
            isCurrent: surfaceKey === key,
          };
        }),
        conclusion: finalConclusion ?? undefined,
      },
    ],
    [comparisonScenarios, finalConclusion, initialVelocity, isZh, recordedCount, records, surfaceKey, tt],
  );

  const graphGeometry = useMemo(
    () =>
      buildVelocityGraph({
        series: motionSeries,
        currentTime,
        x: SVG_STAGE.graphPanelX,
        y: SVG_STAGE.graphPanelY,
        width: SVG_STAGE.graphPanelWidth,
        height: SVG_STAGE.graphPanelHeight,
        maxValue: graphVelocityDomain,
        maxTime: currentScenario.physicalDurationSeconds,
      }),
    [currentScenario.physicalDurationSeconds, currentTime, graphVelocityDomain, motionSeries],
  );

  function invalidateObservation() {
    clearPlaybackTimer(timerRef.current);
    timerRef.current = null;
    setObservationState("idle");
    setCurrentTime(0);
  }

  function startObservation() {
    clearPlaybackTimer(timerRef.current);
    timerRef.current = null;
    setObservationState("observing");
    setCurrentTime(0);

    let elapsedMs = 0;
    timerRef.current = globalThis.setInterval(() => {
      elapsedMs = Math.min(
        elapsedMs + PLAYBACK_TICK_MS,
        currentScenario.animationDurationMs,
      );

      const progress =
        currentScenario.animationDurationMs <= 0
          ? 1
          : elapsedMs / currentScenario.animationDurationMs;

      setCurrentTime(currentScenario.physicalDurationSeconds * progress);

      if (progress >= 1) {
        clearPlaybackTimer(timerRef.current);
        timerRef.current = null;
        setObservationState("stable");
      }
    }, PLAYBACK_TICK_MS);
  }

  function recordCurrentObservation() {
    if (!isRecordEnabled) {
      return;
    }

    const nextRecords = {
      ...records,
      [surfaceKey]: {
        key: surfaceKey,
        label: tt(currentScenario.label),
        value: currentScenario.isIdeal
          ? (isZh ? "持续匀速前进" : "Keeps moving uniformly")
          : formatDistance(currentScenario.distanceMeters),
        note: currentScenario.isIdeal
          ? (isZh
            ? `预览 ${formatSeconds(currentScenario.physicalDurationSeconds)} · v 保持 ${formatVelocity(initialVelocity)}`
            : `Preview ${formatSeconds(currentScenario.physicalDurationSeconds)} · v stays ${formatVelocity(initialVelocity)}`)
          : (isZh
            ? `停止时间 ${formatSeconds(currentScenario.stopTimeSeconds ?? 0)} · v0 = ${formatVelocity(initialVelocity)}`
            : `Stop time ${formatSeconds(currentScenario.stopTimeSeconds ?? 0)} · v0 = ${formatVelocity(initialVelocity)}`),
      },
    };

    setRecords(nextRecords);

    const nextSurface = SURFACE_SEQUENCE.find((key) => !nextRecords[key]);
    if (nextSurface) {
      setSurfaceKey(nextSurface);
      invalidateObservation();
    }
  }

  function resetLab() {
    clearPlaybackTimer(timerRef.current);
    timerRef.current = null;
    setInitialVelocity(DEFAULT_INITIAL_VELOCITY);
    setSurfaceKey("towel");
    setObservationState("idle");
    setCurrentTime(0);
    setRecords({});
  }

  function handleVelocityChange(nextValue: number) {
    setInitialVelocity(nextValue);
    setRecords({});
    invalidateObservation();
  }

  const primaryActionLabel = observationState === "observing"
    ? (isZh ? "演示中…" : "Observing…")
    : observationState === "stable"
      ? (isZh ? "重新释放" : "Replay run")
      : (isZh ? "开始释放" : "Release cart");
  const recordButtonLabel = currentSurfaceRecorded
    ? (isZh ? "更新本组" : "Update current run")
    : (isZh ? "记录本组" : "Record current run");
  const stageProgressRatio = recordedCount / SURFACE_SEQUENCE.length;
  const currentTaskCopy = (() => {
    if (observationState === "observing") {
      return currentScenario.isIdeal
        ? (isZh
          ? "观察理想光滑面上的匀速前进，并把它作为结论外推。"
          : "Observe the uniform motion on the ideal surface and extend it as the final inference.")
        : (isZh
          ? `观察${tt(currentScenario.shortLabel)}上的减速快慢和停止点。`
          : `Observe the deceleration and stopping point on ${tt(currentScenario.shortLabel)}.`);
    }

    if (observationState === "stable") {
      if (currentSurfaceRecorded) {
        if (nextPendingSurfaceKey) {
          return isZh
            ? `当前组已记录，继续切换到${tt(SURFACE_PRESETS[nextPendingSurfaceKey].shortLabel)}。`
            : `This run is recorded. Continue with ${tt(SURFACE_PRESETS[nextPendingSurfaceKey].shortLabel)}.`;
        }

        return isZh
          ? "四组对照已完成，现在可以归纳牛顿第一定律。"
          : "All four runs are complete. You can now summarize Newton's first law.";
      }

      return isZh
        ? "滑行已完成，先记录本组，再继续下一种阻力面。"
        : "This run has finished. Record it before moving to the next surface.";
    }

    return currentScenario.isIdeal
      ? (isZh
        ? "保持同一初速度，释放理想光滑面并观察小车不会自行停下。"
        : "Keep the same starting speed and observe that the cart will not stop on the ideal surface.")
      : (isZh
        ? `保持同一初速度，释放${tt(currentScenario.shortLabel)}并比较滑行距离。`
        : `Keep the same starting speed and release the cart on ${tt(currentScenario.shortLabel)}.`);
  })();
  const progressLabel = isZh
    ? `已完成 ${recordedCount} / ${SURFACE_SEQUENCE.length} 组`
    : `${recordedCount} / ${SURFACE_SEQUENCE.length} runs recorded`;

  const trackWidth = SVG_STAGE.trackEndX - SVG_STAGE.trackStartX;
  const cartFrontX =
    SVG_STAGE.trackStartX +
    trackWidth * (trackDistanceDomain <= 0 ? 0 : currentMotion.position / trackDistanceDomain);
  const stopMarkerX = currentScenario.isIdeal
    ? null
    : SVG_STAGE.trackStartX +
      trackWidth * (currentScenario.distanceMeters / trackDistanceDomain);

  return (
    <section ref={fullscreenRef} className="visual-shell force-lab-shell newton-lab-shell">
      <div
        className={
          isControlPanelCollapsed
            ? "force-lab-layout motion-lab-layout newton-lab-layout is-collapsed"
            : "force-lab-layout motion-lab-layout newton-lab-layout"
        }
      >
        <aside
          className={
            isControlPanelCollapsed
              ? "force-control-panel motion-control-panel newton-control-panel is-collapsed"
              : "force-control-panel motion-control-panel newton-control-panel"
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

              <div className="force-control-scroll motion-control-scroll newton-control-scroll">
                <ControlPanelSection
                  title={isZh ? "实验控制" : "Experiment Flow"}
                  hint={isZh ? "先释放，再记录，再换阻力面" : "Release, record, then switch surfaces"}
                  accent
                >
                  <ControlStatusBar
                    items={[
                      <StatusPill key="surface">{tt(currentScenario.label)}</StatusPill>,
                      <StatusPill key="progress">{progressLabel}</StatusPill>,
                    ]}
                    status={<StatusPill tone={stageStateMeta.tone}>{stageStateMeta.label}</StatusPill>}
                  />

                  <div className="force-action-grid">
                    <ControlButton
                      variant="primary"
                      size="compact"
                      disabled={observationState === "observing"}
                      onClick={startObservation}
                    >
                      {primaryActionLabel}
                    </ControlButton>
                    <ControlButton
                      variant="ghost"
                      size="compact"
                      disabled={!isRecordEnabled}
                      onClick={recordCurrentObservation}
                    >
                      {recordButtonLabel}
                    </ControlButton>
                    <ControlButton variant="ghost" size="compact" onClick={resetLab}>
                      {tt("重置")}
                    </ControlButton>
                  </div>

                  <div className="force-support-chip-list newton-flow-chip-list">
                    <span className="force-support-chip">{`v0 = ${formatVelocity(initialVelocity)}`}</span>
                    <span className="force-support-chip">
                      {nextPendingSurfaceKey
                        ? (isZh
                          ? `下一组：${tt(SURFACE_PRESETS[nextPendingSurfaceKey].shortLabel)}`
                          : `Next: ${tt(SURFACE_PRESETS[nextPendingSurfaceKey].shortLabel)}`)
                        : tt("已完成全部对照")}
                    </span>
                  </div>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "核心变量" : "Core Variables"}
                  hint={isZh ? "调整初速度会清空当前对照记录" : "Changing speed clears the current comparison"}
                >
                  <ControlRange
                    id="newton-initial-velocity"
                    label={isZh ? "初速度" : "Initial Velocity"}
                    unit="m/s"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={initialVelocity}
                    editable
                    onChange={handleVelocityChange}
                  />

                  <ControlChipGroup
                    items={SURFACE_SEQUENCE.map((key) => ({
                      key,
                      label: tt(SURFACE_PRESETS[key].label),
                      active: surfaceKey === key,
                      onClick: () => {
                        setSurfaceKey(key);
                        invalidateObservation();
                      },
                    }))}
                    columns={2}
                    size="dense"
                  />
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "记录实验单" : "Experiment Worksheet"}
                  hint={isZh ? "先完成本组观察，再记录到四组对照表" : "Record each run after observing it"}
                >
                  <BasicForceRecordTable
                    groups={recordGroups}
                    emptyTitle={isZh ? "先完成第一组释放" : "Finish the first release"}
                    emptyCopy={
                      isZh
                        ? "课堂记录会保留四种阻力面的对照，便于直接归纳“阻力越小，滑行越远”。"
                        : "The worksheet keeps all four surfaces so the conclusion is easy to compare."
                    }
                    pendingCopy={isZh ? "待测" : "Pending"}
                  />
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "课堂问题" : "Class Prompts"}
                >
                  <ul className="force-support-question-list">
                    <li>{isZh ? "为什么三次实验必须从同一高度、同一初速度释放？" : "Why must every run use the same release height and speed?"}</li>
                    <li>{isZh ? "如果水平面绝对光滑，小车会不会自己停下？" : "Would the cart stop by itself on a perfectly smooth surface?"}</li>
                    <li>{isZh ? "力是维持运动的原因，还是改变运动状态的原因？" : "Does force keep motion going, or does it change motion?"}</li>
                  </ul>
                </ControlPanelSection>
              </div>
            </>
          )}
        </aside>

        <div className="force-lab-main newton-lab-main">
          <div
            className={
              viewMode === "3d"
                ? "visual-canvas motion-stage-canvas newton-stage-canvas is-3d-mode"
                : "visual-canvas motion-stage-canvas newton-stage-canvas"
            }
          >
            <FullscreenToggleButton
              isFullscreen={isFullscreen}
              onToggle={onToggleFullscreen}
              variant="floating"
            />
            <VisualModeSwitch
              className="motion-stage-view-switch"
              value={viewMode}
              options={NEWTON_VIEW_OPTIONS}
              onChange={(nextValue) => setViewMode(nextValue as NewtonViewMode)}
            />
            <div className="visual-grid-layer" />
            <div className="visual-glow visual-glow-a" />
            <div className="visual-glow visual-glow-b" />
            <div className="visual-line visual-line-a" />
            <div className="visual-line visual-line-b" />

            <div className="newton-stage-layout">
              <div className="newton-stage-visual">
                {viewMode === "2d" ? (
                <svg
                  viewBox={`0 0 ${SVG_STAGE.width} ${SVG_STAGE.height}`}
                  preserveAspectRatio="xMidYMin meet"
                  className="motion-stage-svg newton-stage-svg"
                  role="img"
                  aria-label={isZh ? `${tt(topic.title)}可视化示意图` : `${tt(topic.title)} visualization`}
                >
                  <rect
                    x={SVG_STAGE.trackPanelX}
                    y={SVG_STAGE.trackPanelY}
                    width={SVG_STAGE.trackPanelWidth}
                    height={SVG_STAGE.trackPanelHeight}
                    rx="34"
                    className="motion-stage-panel-shell"
                  />

                  <path
                    d={`M${SVG_STAGE.rampStartX} ${SVG_STAGE.trackY} L${SVG_STAGE.rampEndX} ${SVG_STAGE.trackY} L${SVG_STAGE.rampStartX} ${SVG_STAGE.rampTopY} Z`}
                    className="newton-stage-ramp"
                  />
                  <rect
                    x={SVG_STAGE.trackStartX}
                    y={SVG_STAGE.trackY - 14}
                    width={SVG_STAGE.trackEndX - SVG_STAGE.trackStartX}
                    height="28"
                    rx="14"
                    className={`newton-stage-surface-fill ${currentScenario.colorClass}`}
                  />
                  <line
                    x1={SVG_STAGE.trackStartX}
                    y1={SVG_STAGE.trackY}
                    x2={SVG_STAGE.trackEndX}
                    y2={SVG_STAGE.trackY}
                    className="motion-stage-track-line"
                  />

                  {Array.from({ length: 5 }).map((_, index) => {
                    const ratio = index / 4;
                    const x = SVG_STAGE.trackStartX + trackWidth * ratio;
                    return (
                      <g key={`tick-${index}`}>
                        <line
                          x1={x}
                          y1={SVG_STAGE.trackY - 20}
                          x2={x}
                          y2={SVG_STAGE.trackY + 22}
                          className="motion-stage-ruler-tick"
                        />
                        <text
                          x={x}
                          y={SVG_STAGE.trackY + 46}
                          textAnchor="middle"
                          className="motion-stage-ruler-label"
                        >
                          {formatDistance(trackDistanceDomain * ratio)}
                        </text>
                      </g>
                    );
                  })}

                  <text x={SVG_STAGE.rampStartX + 8} y={SVG_STAGE.rampTopY - 8} className="motion-stage-ruler-label">
                    {tt("同一高度释放")}
                  </text>
                  <text
                    x={SVG_STAGE.trackStartX - 18}
                    y={SVG_STAGE.trackY - 42}
                    textAnchor="end"
                    className="motion-stage-ruler-label"
                  >
                    {`v0 = ${formatVelocity(initialVelocity)}`}
                  </text>

                  {stopMarkerX !== null ? (
                    <g>
                      <line
                        x1={stopMarkerX}
                        y1={SVG_STAGE.trackY - 102}
                        x2={stopMarkerX}
                        y2={SVG_STAGE.trackY + 30}
                        className="newton-stage-stop-line"
                      />
                      <text
                        x={stopMarkerX}
                        y={SVG_STAGE.trackY - 118}
                        textAnchor="middle"
                        className="motion-stage-stop-label"
                      >
                        {tt("停止点")}
                      </text>
                    </g>
                  ) : (
                    <line
                      x1={cartFrontX + 20}
                      y1={SVG_STAGE.trackY - 54}
                      x2={SVG_STAGE.trackEndX - 12}
                      y2={SVG_STAGE.trackY - 54}
                      className="newton-stage-ideal-line"
                    />
                  )}

                  <MotionCartAsset
                    frontX={cartFrontX}
                    wheelBaseY={SVG_STAGE.trackY - 2}
                    scale={DEFAULT_MOTION_CART_SCALE}
                    travelDistance={currentMotion.position * 100}
                  />

                  <line
                    x1={cartFrontX + 12}
                    y1={SVG_STAGE.trackY - 48}
                    x2={cartFrontX + 12 + 118 * (currentMotion.velocity / Math.max(initialVelocity, 0.0001))}
                    y2={SVG_STAGE.trackY - 48}
                    className="motion-stage-velocity-arrow"
                  />

                  <rect
                    x={SVG_STAGE.graphPanelX}
                    y={SVG_STAGE.graphPanelY}
                    width={SVG_STAGE.graphPanelWidth}
                    height={SVG_STAGE.graphPanelHeight}
                    rx="28"
                    className="motion-stage-graph-shell"
                  />
                  <text
                    x={SVG_STAGE.graphPanelX + 28}
                    y={SVG_STAGE.graphPanelY + 34}
                    className="motion-stage-panel-title"
                  >
                    {tt("速度 - 时间曲线")}
                  </text>

                  {graphGeometry.yTicks.map((tick) => (
                    <g key={tick.key}>
                      <line
                        x1={tick.x1}
                        y1={tick.y}
                        x2={tick.x2}
                        y2={tick.y}
                        className="motion-stage-graph-grid"
                      />
                      <text x={tick.labelX} y={tick.y + 4} className="motion-stage-graph-axis-label">
                        {tick.label}
                      </text>
                    </g>
                  ))}

                  {graphGeometry.xTicks.map((tick) => (
                    <g key={tick.key}>
                      <line
                        x1={tick.x}
                        y1={tick.y1}
                        x2={tick.x}
                        y2={tick.y2}
                        className="motion-stage-graph-grid"
                      />
                      <text x={tick.x} y={tick.labelY} textAnchor="middle" className="motion-stage-graph-axis-label">
                        {tick.label}
                      </text>
                    </g>
                  ))}

                  <polyline points={graphGeometry.fullPolyline} className="motion-stage-graph-line is-secondary-muted" />
                  <polyline points={graphGeometry.playedPolyline} className="motion-stage-graph-line is-secondary" />
                  <line
                    x1={graphGeometry.currentPoint.x}
                    y1={graphGeometry.chartTop}
                    x2={graphGeometry.currentPoint.x}
                    y2={graphGeometry.chartBottom}
                    className="motion-stage-guide-line is-chart"
                  />
                  <circle
                    cx={graphGeometry.currentPoint.x}
                    cy={graphGeometry.currentPoint.y}
                    r="7"
                    className="motion-stage-graph-point is-secondary"
                  />
                </svg>
                ) : (
                  <>
                    <NewtonFirstLawThreeStage
                      currentMotion={currentMotion}
                      observationState={observationState}
                      physicalDurationSeconds={currentScenario.physicalDurationSeconds}
                      distanceDomain={trackDistanceDomain}
                      stopDistanceMeters={currentScenario.stopTimeSeconds === null ? null : currentScenario.distanceMeters}
                      surfaceKey={surfaceKey}
                      accentColor={currentScenario.accent}
                      resistanceLabel={currentScenario.resistanceLabel}
                    />
                    <div className="motion-stage-overlay is-top-left">
                      <div className="motion-stage-3d-hud">
                        <div className="motion-stage-hud-head is-compact">
                          <span className="motion-stage-mode-pill">3D</span>
                          <span className="motion-stage-kpi-pill">{tt(currentScenario.shortLabel)}</span>
                          <span className="motion-stage-kpi-pill">{tt("左拖旋转 · 滚轮缩放")}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <aside className="newton-stage-side-rail" aria-label={isZh ? "数值信息面板" : "Numerical info panel"}>
                <div className="force-stage-hud-card is-tight newton-stage-side-card newton-stage-brief-card">
                  <div className="newton-stage-brief-head">
                    <StatusPill tone={stageStateMeta.tone}>{stageStateMeta.label}</StatusPill>
                    <span className="force-stage-chip">{progressLabel}</span>
                  </div>
                  <p className="newton-stage-brief-copy">{currentTaskCopy}</p>
                  <div className="force-stage-chip-grid newton-stage-brief-chips">
                    <span className="force-stage-chip">{tt(currentScenario.label)}</span>
                    <span className="force-stage-chip">{`v0 = ${formatVelocity(initialVelocity)}`}</span>
                    <span className="force-stage-chip">{tt(currentScenario.resistanceLabel)}</span>
                  </div>
                </div>

                <div className="force-stage-hud-card is-tight newton-stage-side-card">
                  <div className="force-stage-hud-head">
                    <span className="force-stage-hud-title">{isZh ? "实时读数" : "Live Reading"}</span>
                  </div>
                  <div className="pressure-stage-metric-grid">
                    <article className="force-stage-result-pill">
                      <strong>{formatSeconds(currentMotion.time)}</strong>
                      <span>{isZh ? "时间 t" : "Time t"}</span>
                    </article>
                    <article className="force-stage-result-pill">
                      <strong>{formatVelocity(currentMotion.velocity)}</strong>
                      <span>{isZh ? "速度 v" : "Velocity v"}</span>
                    </article>
                    <article className="force-stage-result-pill">
                      <strong>{formatDistance(currentMotion.position)}</strong>
                      <span>{isZh ? "位移 s" : "Distance s"}</span>
                    </article>
                    <article className="force-stage-result-pill">
                      <strong>
                        {currentScenario.isIdeal
                          ? (isZh ? "不会停下" : "No stop")
                          : formatSeconds(currentScenario.stopTimeSeconds ?? 0)}
                      </strong>
                      <span>{isZh ? "停止时刻" : "Stop time"}</span>
                    </article>
                  </div>
                </div>

                <div className="force-stage-hud-card is-tight pressure-stage-comparison-card newton-stage-side-card">
                  <div className="force-stage-hud-head">
                    <span className="force-stage-hud-title">{isZh ? "阻力面对照" : "Surface Comparison"}</span>
                    <span className="force-stage-chip">{isZh ? `${recordedCount} / 4` : `${recordedCount} / 4`}</span>
                  </div>
                  <div className="pressure-stage-bar-list">
                    {comparisonRows.map((row) => (
                      <article key={row.key} className="pressure-stage-bar-row">
                        <div className="pressure-stage-bar-head">
                          <strong>{row.label}</strong>
                          <span>{row.valueLabel}</span>
                        </div>
                        <div className="pressure-stage-bar-track">
                          <span
                            className={row.active ? "pressure-stage-bar-fill is-active" : "pressure-stage-bar-fill"}
                            style={{ width: `${row.percent}%` }}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function buildScenario(surfaceKey: SurfaceKey, initialVelocity: number): SurfaceScenario {
  const preset = SURFACE_PRESETS[surfaceKey];

  if (surfaceKey === "ideal") {
    return {
      ...preset,
      initialVelocity,
      distanceMeters: initialVelocity * IDEAL_PREVIEW_SECONDS,
      stopTimeSeconds: null,
      physicalDurationSeconds: IDEAL_PREVIEW_SECONDS,
      isIdeal: true,
    };
  }

  const stopTimeSeconds = initialVelocity / preset.deceleration;
  const distanceMeters = (initialVelocity * initialVelocity) / (2 * preset.deceleration);

  return {
    ...preset,
    initialVelocity,
    distanceMeters,
    stopTimeSeconds,
    physicalDurationSeconds: stopTimeSeconds,
    isIdeal: false,
  };
}

function resolveMotionPoint(scenario: SurfaceScenario, time: number): MotionPoint {
  const clampedTime = Math.max(0, Math.min(time, scenario.physicalDurationSeconds));

  if (scenario.isIdeal) {
    return {
      time: clampedTime,
      position: scenario.initialVelocity * clampedTime,
      velocity: scenario.initialVelocity,
      hasStopped: false,
    };
  }

  const velocity = Math.max(0, scenario.initialVelocity - scenario.deceleration * clampedTime);
  const position = Math.min(
    scenario.distanceMeters,
    scenario.initialVelocity * clampedTime - 0.5 * scenario.deceleration * clampedTime * clampedTime,
  );

  return {
    time: clampedTime,
    position,
    velocity,
    hasStopped: velocity <= 0.0001 || clampedTime >= scenario.physicalDurationSeconds,
  };
}

function buildMotionSeries(scenario: SurfaceScenario) {
  return Array.from({ length: GRAPH_SAMPLE_COUNT }, (_, index) => {
    const ratio = index / (GRAPH_SAMPLE_COUNT - 1);
    const time = scenario.physicalDurationSeconds * ratio;
    return resolveMotionPoint(scenario, time);
  });
}

function buildVelocityGraph({
  series,
  currentTime,
  x,
  y,
  width,
  height,
  maxValue,
  maxTime,
}: {
  series: MotionPoint[];
  currentTime: number;
  x: number;
  y: number;
  width: number;
  height: number;
  maxValue: number;
  maxTime: number;
}) {
  const padding = { top: 54, right: 28, bottom: 38, left: 52 };
  const chartLeft = x + padding.left;
  const chartRight = x + width - padding.right;
  const chartTop = y + padding.top;
  const chartBottom = y + height - padding.bottom;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  const mapTime = (value: number) =>
    chartLeft + chartWidth * (maxTime <= 0 ? 0 : value / maxTime);
  const mapVelocity = (value: number) =>
    chartBottom - chartHeight * (maxValue <= 0 ? 0 : value / maxValue);

  const fullPolyline = series
    .map((point) => `${mapTime(point.time)},${mapVelocity(point.velocity)}`)
    .join(" ");

  const playedSeries = series.filter((point) => point.time <= currentTime + 0.0001);
  const safePlayedSeries = playedSeries.length > 0 ? playedSeries : [series[0]];
  const playedPolyline = safePlayedSeries
    .map((point) => `${mapTime(point.time)},${mapVelocity(point.velocity)}`)
    .join(" ");

  return {
    chartTop,
    chartBottom,
    fullPolyline,
    playedPolyline,
    currentPoint: {
      x: mapTime(currentTime),
      y: mapVelocity(safePlayedSeries[safePlayedSeries.length - 1]?.velocity ?? 0),
    },
    yTicks: Array.from({ length: 5 }).map((_, index) => {
      const ratio = index / 4;
      const value = maxValue * (1 - ratio);
      const lineY = chartTop + chartHeight * ratio;

      return {
        key: `y-${index}`,
        y: lineY,
        x1: chartLeft,
        x2: chartRight,
        labelX: x + 16,
        label: formatVelocity(value),
      };
    }),
    xTicks: Array.from({ length: 5 }).map((_, index) => {
      const ratio = index / 4;
      const time = maxTime * ratio;
      const lineX = chartLeft + chartWidth * ratio;

      return {
        key: `x-${index}`,
        x: lineX,
        y1: chartTop,
        y2: chartBottom,
        labelY: y + height - 12,
        label: formatSeconds(time),
      };
    }),
  };
}

function formatVelocity(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "")} m/s`;
}

function formatDistance(value: number) {
  if (value >= 10) {
    return `${value.toFixed(1)} m`;
  }

  return `${value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")} m`;
}

function formatSeconds(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "")} s`;
}

function readStoredNewtonViewMode(): NewtonViewMode {
  if (typeof window === "undefined") {
    return "2d";
  }

  return window.localStorage.getItem(VIEW_MODE_STORAGE_KEY) === "3d"
    ? "3d"
    : "2d";
}

function clearPlaybackTimer(timerId: TimerId | null) {
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
