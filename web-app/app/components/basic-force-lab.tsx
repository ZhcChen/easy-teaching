import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import { BasicForceThreeStage } from "./basic-force-three-stage";
import { ControlButton } from "./control-button";
import { ControlChipGroup } from "./control-chip-group";
import { ControlPanelSection } from "./control-panel-section";
import { ControlRange } from "./control-range";
import { ControlStepGroup } from "./control-step-group";
import { ControlStatusBar } from "./control-status-bar";
import { StatusPill } from "./status-pill";
import { VisualModeSwitch } from "./visual-mode-switch";
import type { TeachingTopic } from "../data/teaching-catalog";

type ForceKey = "gravity" | "normal" | "pull" | "friction" | "net";
type MotionState = "rest" | "threshold" | "sliding";
type Tone = "balanced" | "warning" | "active";
type SurfacePresetKey = "smooth-board" | "wood-board" | "cloth" | "towel";
type ContactAreaKey = "flat" | "side" | "upright";
type ForceExperimentMode = "measurement" | "constant-pull" | "manual-drag";
type ExperimentPhase =
  | "idle"
  | "ramping"
  | "breakaway"
  | "uniform"
  | "stuck"
  | "accelerating"
  | "complete";
type ForceViewMode = "2d" | "3d";

type BasicForceLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type ForceRow = {
  key: ForceKey;
  label: string;
  value: number;
  color: string;
  description: string;
};

type ForceTimelineSample = {
  timeMs: number;
  timeSeconds: number;
  phase: ExperimentPhase;
  pullForce: number;
  frictionForce: number;
  netForce: number;
  displacement: number;
  velocity: number;
  acceleration: number;
};

type SurfacePreset = {
  key: SurfacePresetKey;
  label: string;
  description: string;
  muStatic: number;
  muKinetic: number;
  accent: string;
  strip: string;
  roughness: number;
};

type ContactAreaPreset = {
  key: ContactAreaKey;
  label: string;
  description: string;
  blockWidth: number;
  blockHeight: number;
};

type ExperimentMetrics = {
  massEquivalent: number;
  pressure: number;
  weight: number;
  normal: number;
  staticLimit: number;
  kineticFriction: number;
  breakawayForce: number;
};

type ExperimentScene = {
  phase: ExperimentPhase;
  weight: number;
  normal: number;
  pullForce: number;
  frictionForce: number;
  netForce: number;
  acceleration: number;
  staticLimit: number;
  kineticFriction: number;
  frictionModeLabel: string;
  stateLabel: string;
  stateTone: Tone;
  motionState: MotionState;
  isMoving: boolean;
  summary: string;
  motionHint: string;
  travelProgress: number;
  readingRatio: number;
  displacement: number;
  velocity: number;
};

type ExperimentStatus = {
  phase: ExperimentPhase;
  label: string;
  badge: string;
  description: string;
  formula: string;
  progress: number;
};

type ExperimentRecord = {
  id: number;
  surfaceLabel: string;
  contactAreaLabel: string;
  pressure: number;
  kineticFriction: number;
  staticLimit: number;
};

type StageLayout = {
  width: number;
  height: number;
  panelX: number;
  panelY: number;
  panelWidth: number;
  scenePanelHeight: number;
  graphY: number;
  graphWidth: number;
  graphHeight: number;
  graphGap: number;
  groundY: number;
  blockX: number;
  blockY: number;
  blockWidth: number;
  blockHeight: number;
  centerX: number;
  centerY: number;
  startX: number;
  maxTravel: number;
  travel: number;
  startCenterX: number;
  springX: number;
  springY: number;
  ropeStartX: number;
  ropeEndX: number;
  weightSlots: Array<{ x: number; y: number }>;
};

const FORCE_COLORS: Record<ForceKey, string> = {
  gravity: "#ff6b6b",
  normal: "#34d399",
  pull: "#60a5fa",
  friction: "#f59e0b",
  net: "#c084fc",
};

const DEFAULT_VALUES = {
  mode: "measurement" as ForceExperimentMode,
  pressure: 4,
  constantPullForce: 1.2,
  surfacePreset: "wood-board" as SurfacePresetKey,
  contactArea: "flat" as ContactAreaKey,
};

const GRAVITY = 9.8;
const RAMP_DURATION_MS = 1500;
const BREAKAWAY_DURATION_MS = 900;
const UNIFORM_DURATION_MS = 1800;
const CONSTANT_PULL_STARTUP_MS = 320;
const CONSTANT_PULL_DURATION_MS = 2400;
const FORCE_GRAPH_SAMPLE_COUNT = 72;
const FORCE_GRAPH_PADDING = { top: 48, right: 48, bottom: 34, left: 48 };
const FORCE_VIEW_STORAGE_KEY = "easy-teaching.basic-force.view-mode";
const FORCE_PANEL_COLLAPSED_STORAGE_KEY = "easy-teaching.basic-force.panel-collapsed";
const MANUAL_MAX_PULL_FORCE = 8;
const MANUAL_MAX_DISTANCE_METERS = 3.2;
const MANUAL_TIMELINE_MAX_MS = 8000;
const MANUAL_MIN_TIMELINE_SECONDS = 2.7;
const MANUAL_SPEED_THRESHOLD = 0.04;
const FORCE_SVG_STAGE = {
  minWidth: 1280,
  maxWidth: 1720,
  height: 960,
  panelX: 24,
  panelY: 110,
  scenePanelHeight: 288,
  sceneGroundY: 324,
  sceneInset: 92,
  graphY: 446,
  graphGap: 24,
  graphHeight: 480,
};
const FORCE_VIEW_OPTIONS = [
  {
    key: "2d",
    label: "2D",
    title: "2D 受力解析",
  },
  {
    key: "3d",
    label: "3D",
    title: "3D 实验场景",
  },
] as const;
const FORCE_MODE_OPTIONS = [
  {
    key: "measurement",
    label: "实验测量",
    title: "逐步增大拉力，观察最大静摩擦与稳定动摩擦。",
  },
  {
    key: "constant-pull",
    label: "恒力拉动",
    title: "直接给定恒定拉力，观察合力、加速度、速度和位移变化。",
  },
  {
    key: "manual-drag",
    label: "手动拖动",
    title: "直接在 2D 画布里拖动木块，用拖动速度观察受力和轨迹变化。",
  },
] as const;

const SURFACE_PRESETS: SurfacePreset[] = [
  {
    key: "smooth-board",
    label: "光滑木板",
    description: "阻力较小，最容易拉动。",
    muStatic: 0.12,
    muKinetic: 0.1,
    accent: "#7bc1ff",
    strip: "rgba(123, 193, 255, 0.16)",
    roughness: 0.45,
  },
  {
    key: "wood-board",
    label: "普通木板",
    description: "适合作为默认对照组。",
    muStatic: 0.24,
    muKinetic: 0.2,
    accent: "#f0b35e",
    strip: "rgba(240, 179, 94, 0.18)",
    roughness: 0.8,
  },
  {
    key: "cloth",
    label: "棉布面",
    description: "粗糙程度明显提升。",
    muStatic: 0.42,
    muKinetic: 0.35,
    accent: "#46d7a7",
    strip: "rgba(70, 215, 167, 0.18)",
    roughness: 1.35,
  },
  {
    key: "towel",
    label: "毛巾面",
    description: "阻力最大，读数变化最明显。",
    muStatic: 0.58,
    muKinetic: 0.5,
    accent: "#c38fff",
    strip: "rgba(195, 143, 255, 0.18)",
    roughness: 1.9,
  },
];

const CONTACT_AREAS: ContactAreaPreset[] = [
  {
    key: "flat",
    label: "正放",
    description: "接触面积最大，作为默认状态。",
    blockWidth: 168,
    blockHeight: 92,
  },
  {
    key: "side",
    label: "侧放",
    description: "面积变小，但材料与压力不变。",
    blockWidth: 132,
    blockHeight: 116,
  },
  {
    key: "upright",
    label: "竖放",
    description: "面积最小，用来验证面积无关。",
    blockWidth: 102,
    blockHeight: 148,
  },
];

export function BasicForceLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: BasicForceLabProps) {
  const [mode, setMode] = useState<ForceExperimentMode>(DEFAULT_VALUES.mode);
  const [viewMode, setViewMode] = useState<ForceViewMode>(readStoredForceViewMode);
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] =
    useState(readStoredForcePanelCollapsed);
  const [pressure, setPressure] = useState(DEFAULT_VALUES.pressure);
  const [constantPullForce, setConstantPullForce] = useState(DEFAULT_VALUES.constantPullForce);
  const [surfacePreset, setSurfacePreset] = useState<SurfacePresetKey>(DEFAULT_VALUES.surfacePreset);
  const [contactArea, setContactArea] = useState<ContactAreaKey>(DEFAULT_VALUES.contactArea);
  const [activeForce, setActiveForce] = useState<ForceKey>("gravity");
  const [hasExperimentRun, setHasExperimentRun] = useState(false);
  const [isExperimentRunning, setIsExperimentRunning] = useState(false);
  const [experimentElapsedMs, setExperimentElapsedMs] = useState(0);
  const [currentRunId, setCurrentRunId] = useState(0);
  const [runRecords, setRunRecords] = useState<ExperimentRecord[]>([]);
  const [manualIsRecording, setManualIsRecording] = useState(false);
  const [manualIsDragging, setManualIsDragging] = useState(false);
  const [manualSeries, setManualSeries] = useState<ForceTimelineSample[]>(() => [
    createIdleForceSample(),
  ]);
  const hasMountedRef = useRef(false);
  const lastRecordedRunRef = useRef(0);
  const playbackFrameRef = useRef<number | null>(null);
  const playbackElapsedRef = useRef(0);
  const stageCanvasRef = useRef<HTMLDivElement | null>(null);
  const forceStageSvgRef = useRef<SVGSVGElement | null>(null);
  const [stageFrameAspect, setStageFrameAspect] = useState(
    FORCE_SVG_STAGE.minWidth / FORCE_SVG_STAGE.height,
  );
  const manualDragRef = useRef({
    active: false,
    pointerId: -1,
    pointerOffsetX: 0,
    startAtMs: 0,
    lastAtMs: 0,
    lastDisplacement: 0,
    lastVelocity: 0,
    lastTravelProgress: 0,
  });

  const surfacePresetMeta =
    SURFACE_PRESETS.find((item) => item.key === surfacePreset) ?? SURFACE_PRESETS[1];
  const contactAreaMeta =
    CONTACT_AREAS.find((item) => item.key === contactArea) ?? CONTACT_AREAS[0];

  const metrics = useMemo(
    () =>
      computeExperimentMetrics({
        pressure,
        muStatic: surfacePresetMeta.muStatic,
        muKinetic: surfacePresetMeta.muKinetic,
      }),
    [pressure, surfacePresetMeta.muKinetic, surfacePresetMeta.muStatic],
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    setHasExperimentRun(false);
    setIsExperimentRunning(false);
    setExperimentElapsedMs(0);
    setActiveForce("gravity");
    setManualIsRecording(false);
    setManualIsDragging(false);
    setManualSeries([createIdleForceSample()]);
    manualDragRef.current = {
      active: false,
      pointerId: -1,
      pointerOffsetX: 0,
      startAtMs: 0,
      lastAtMs: 0,
      lastDisplacement: 0,
      lastVelocity: 0,
      lastTravelProgress: 0,
    };
  }, [constantPullForce, contactArea, mode, pressure, surfacePreset]);

  useEffect(() => {
    if (mode === "manual-drag" && viewMode !== "2d") {
      setViewMode("2d");
    }
  }, [mode, viewMode]);

  const isManualMode = mode === "manual-drag";
  const totalExperimentMs =
    mode === "measurement"
      ? RAMP_DURATION_MS + BREAKAWAY_DURATION_MS + UNIFORM_DURATION_MS
      : mode === "constant-pull"
        ? CONSTANT_PULL_STARTUP_MS + CONSTANT_PULL_DURATION_MS
        : MANUAL_TIMELINE_MAX_MS;

  useEffect(() => {
    playbackElapsedRef.current = experimentElapsedMs;
  }, [experimentElapsedMs]);

  useEffect(() => {
    const node = stageCanvasRef.current;

    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateStageFrameAspect = () => {
      const { width, height } = node.getBoundingClientRect();

      if (width <= 0 || height <= 0) {
        return;
      }

      const nextAspect = width / height;

      setStageFrameAspect((currentAspect) =>
        Math.abs(currentAspect - nextAspect) >= 0.02 ? nextAspect : currentAspect,
      );
    };

    updateStageFrameAspect();

    const observer = new ResizeObserver(() => {
      updateStageFrameAspect();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isManualMode || !isExperimentRunning) {
      playbackFrameRef.current = null;
      return;
    }

    let animationFrameId = 0;

    const tick = (timestamp: number) => {
      if (playbackFrameRef.current === null) {
        playbackFrameRef.current = timestamp;
        animationFrameId = window.requestAnimationFrame(tick);
        return;
      }

      const deltaMs = timestamp - playbackFrameRef.current;
      playbackFrameRef.current = timestamp;
      const nextElapsedMs = Math.min(playbackElapsedRef.current + deltaMs, totalExperimentMs);
      playbackElapsedRef.current = nextElapsedMs;
      setExperimentElapsedMs(nextElapsedMs);

      if (nextElapsedMs >= totalExperimentMs) {
        playbackFrameRef.current = null;
        setIsExperimentRunning(false);
        return;
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isExperimentRunning, isManualMode, totalExperimentMs]);

  const autoHasPlaybackStarted = hasExperimentRun || isExperimentRunning || experimentElapsedMs > 0;
  const autoDisplayedScene = useMemo(
    () =>
      computeExperimentScene({
        mode: mode === "measurement" ? "measurement" : "constant-pull",
        metrics,
        hasPlaybackStarted: autoHasPlaybackStarted,
        experimentElapsedMs,
        totalExperimentMs,
        constantPullForce,
      }),
    [autoHasPlaybackStarted, constantPullForce, experimentElapsedMs, metrics, mode, totalExperimentMs],
  );
  const autoCurrentTimelineSample = useMemo<ForceTimelineSample>(
    () => ({
      timeMs: experimentElapsedMs,
      timeSeconds: experimentElapsedMs / 1000,
      phase: autoDisplayedScene.phase,
      pullForce: autoDisplayedScene.pullForce,
      frictionForce: autoDisplayedScene.frictionForce,
      netForce: autoDisplayedScene.netForce,
      displacement: autoDisplayedScene.displacement,
      velocity: autoDisplayedScene.velocity,
      acceleration: autoDisplayedScene.acceleration,
    }),
    [autoDisplayedScene, experimentElapsedMs],
  );
  const autoTimelineSeries = useMemo(
    () =>
      buildForceTimelineSeries({
        mode: mode === "measurement" ? "measurement" : "constant-pull",
        metrics,
        totalExperimentMs,
        constantPullForce,
        segments: FORCE_GRAPH_SAMPLE_COUNT,
      }),
    [constantPullForce, metrics, mode, totalExperimentMs],
  );
  const autoPlayedTimelineSeries = useMemo(
    () =>
      buildPlayedForceSeries({
        series: autoTimelineSeries,
        currentSample: autoCurrentTimelineSample,
      }),
    [autoCurrentTimelineSample, autoTimelineSeries],
  );

  const manualCurrentTimelineSample = manualSeries[manualSeries.length - 1] ?? createIdleForceSample();
  const manualTimelineSeries =
    manualSeries.length === 0 ? [createIdleForceSample()] : manualSeries;
  const manualHasPlaybackStarted =
    manualTimelineSeries.length > 1 || manualCurrentTimelineSample.timeMs > 0;
  const manualDurationSeconds = useMemo(() => {
    const latestSeconds = manualCurrentTimelineSample.timeSeconds;
    return Math.min(
      MANUAL_TIMELINE_MAX_MS / 1000,
      Math.max(MANUAL_MIN_TIMELINE_SECONDS, Math.ceil(latestSeconds * 10) / 10),
    );
  }, [manualCurrentTimelineSample.timeSeconds]);
  const manualDisplayedScene = useMemo(
    () =>
      buildManualExperimentScene({
        metrics,
        sample: manualCurrentTimelineSample,
        isRecording: manualIsRecording,
      }),
    [manualCurrentTimelineSample, manualIsRecording, metrics],
  );

  const hasPlaybackStarted = isManualMode ? manualHasPlaybackStarted : autoHasPlaybackStarted;
  const displayedScene = isManualMode ? manualDisplayedScene : autoDisplayedScene;
  const currentTimelineSample = isManualMode
    ? manualCurrentTimelineSample
    : autoCurrentTimelineSample;
  const timelineSeries = isManualMode ? manualTimelineSeries : autoTimelineSeries;
  const playedTimelineSeries = isManualMode ? manualTimelineSeries : autoPlayedTimelineSeries;

  const stage = useMemo(
    () =>
      computeStageLayout({
        contactAreaMeta,
        travelProgress: displayedScene.travelProgress,
        pressure,
        frameAspect: stageFrameAspect,
      }),
    [contactAreaMeta, displayedScene.travelProgress, pressure, stageFrameAspect],
  );

  const progress = isManualMode
    ? clamp01(manualCurrentTimelineSample.timeMs / MANUAL_TIMELINE_MAX_MS)
    : hasPlaybackStarted
      ? clamp01(experimentElapsedMs / totalExperimentMs)
      : 0;
  const durationSeconds = isManualMode ? manualDurationSeconds : totalExperimentMs / 1000;
  const graphTimeTicks = Array.from({ length: 5 }, (_, index) =>
    (durationSeconds * index) / 4,
  );
  const forceDomain = Math.max(
    metrics.staticLimit,
    metrics.kineticFriction,
    isManualMode ? manualCurrentTimelineSample.pullForce : constantPullForce,
    ...timelineSeries.map((sample) => Math.max(sample.pullForce, sample.frictionForce, Math.abs(sample.netForce))),
    1,
  );
  const displacementDomain = Math.max(
    isManualMode ? 0.8 : 0.5,
    ...timelineSeries.map((sample) => sample.displacement * 1.08),
  );
  const velocityDomain = Math.max(
    isManualMode ? 0.6 : 0.4,
    ...timelineSeries.map((sample) => sample.velocity * 1.12),
  );
  const forceGraph = useMemo(
    () =>
      buildForceGraphGeometry({
        series: timelineSeries,
        playedSeries: playedTimelineSeries,
        width: stage.graphWidth,
        height: stage.graphHeight,
        x: stage.panelX,
        y: stage.graphY,
        duration: durationSeconds,
        minValue: 0,
        maxValue: forceDomain,
        mapValue: (sample) => sample.pullForce,
      }),
    [durationSeconds, forceDomain, playedTimelineSeries, stage.graphHeight, stage.graphWidth, stage.graphY, stage.panelX, timelineSeries],
  );
  const frictionGraph = useMemo(
    () =>
      buildForceGraphGeometry({
        series: timelineSeries,
        playedSeries: playedTimelineSeries,
        width: stage.graphWidth,
        height: stage.graphHeight,
        x: stage.panelX,
        y: stage.graphY,
        duration: durationSeconds,
        minValue: 0,
        maxValue: forceDomain,
        mapValue: (sample) => sample.frictionForce,
      }),
    [durationSeconds, forceDomain, playedTimelineSeries, stage.graphHeight, stage.graphWidth, stage.graphY, stage.panelX, timelineSeries],
  );
  const netGraph = useMemo(
    () =>
      buildForceGraphGeometry({
        series: timelineSeries,
        playedSeries: playedTimelineSeries,
        width: stage.graphWidth,
        height: stage.graphHeight,
        x: stage.panelX,
        y: stage.graphY,
        duration: durationSeconds,
        minValue: 0,
        maxValue: forceDomain,
        mapValue: (sample) => Math.max(0, sample.netForce),
      }),
    [durationSeconds, forceDomain, playedTimelineSeries, stage.graphHeight, stage.graphWidth, stage.graphY, stage.panelX, timelineSeries],
  );
  const motionGraphX = stage.panelX + stage.graphWidth + stage.graphGap;
  const displacementGraph = useMemo(
    () =>
      buildForceGraphGeometry({
        series: timelineSeries,
        playedSeries: playedTimelineSeries,
        width: stage.graphWidth,
        height: stage.graphHeight,
        x: motionGraphX,
        y: stage.graphY,
        duration: durationSeconds,
        minValue: 0,
        maxValue: displacementDomain,
        mapValue: (sample) => sample.displacement,
      }),
    [displacementDomain, durationSeconds, motionGraphX, playedTimelineSeries, stage.graphHeight, stage.graphWidth, stage.graphY, timelineSeries],
  );
  const velocityGraph = useMemo(
    () =>
      buildForceGraphGeometry({
        series: timelineSeries,
        playedSeries: playedTimelineSeries,
        width: stage.graphWidth,
        height: stage.graphHeight,
        x: motionGraphX,
        y: stage.graphY,
        duration: durationSeconds,
        minValue: 0,
        maxValue: velocityDomain,
        mapValue: (sample) => sample.velocity,
      }),
    [durationSeconds, motionGraphX, playedTimelineSeries, stage.graphHeight, stage.graphWidth, stage.graphY, timelineSeries, velocityDomain],
  );

  useEffect(() => {
    if (
      mode !== "measurement" ||
      currentRunId === 0 ||
      lastRecordedRunRef.current === currentRunId ||
      isExperimentRunning ||
      experimentElapsedMs < totalExperimentMs
    ) {
      return;
    }

    const nextRecord: ExperimentRecord = {
      id: currentRunId,
      surfaceLabel: surfacePresetMeta.label,
      contactAreaLabel: contactAreaMeta.label,
      pressure,
      kineticFriction: metrics.kineticFriction,
      staticLimit: metrics.staticLimit,
    };

    setRunRecords((previous) => [nextRecord, ...previous].slice(0, 6));
    setActiveForce("friction");
    lastRecordedRunRef.current = currentRunId;
  }, [
    contactAreaMeta.label,
    currentRunId,
    experimentElapsedMs,
    isExperimentRunning,
    metrics.kineticFriction,
    metrics.staticLimit,
    mode,
    pressure,
    surfacePresetMeta.label,
    totalExperimentMs,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(FORCE_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      FORCE_PANEL_COLLAPSED_STORAGE_KEY,
      isControlPanelCollapsed ? "1" : "0",
    );
  }, [isControlPanelCollapsed]);

  const forceRows: ForceRow[] = [
    {
      key: "gravity",
      label: "重力 G",
      value: displayedScene.weight,
      color: FORCE_COLORS.gravity,
      description: `木块和砝码共同受到重力，当前 G = ${formatNumber(displayedScene.weight, 1)} N。水平面实验里，它决定了正压力大小。`,
    },
    {
      key: "normal",
      label: "支持力 N",
      value: displayedScene.normal,
      color: FORCE_COLORS.normal,
      description: `水平接触面上，竖直方向始终平衡，所以支持力 N = ${formatNumber(displayedScene.normal, 1)} N。它同时就是摩擦公式里的压力项。`,
    },
    {
      key: "pull",
      label: "拉力 F",
      value: displayedScene.pullForce,
      color: FORCE_COLORS.pull,
      description:
        mode === "measurement"
          ? displayedScene.phase === "idle"
            ? "开始实验后，测力计会缓慢增大拉力，直到木块开始滑动。"
            : `当前测力计读数 ${formatNumber(displayedScene.pullForce, 1)} N。匀速阶段的稳定读数，就是本次测得的滑动摩擦力。`
          : mode === "manual-drag"
            ? `当前由手动拖动产生的等效拉力约为 ${formatNumber(displayedScene.pullForce, 1)} N。拖动越快，拉力和下方图表抬升得越明显。`
          : `当前恒定拉力固定为 ${formatNumber(constantPullForce, 1)} N。只要它超过最大静摩擦，木块就会持续加速。`,
    },
    {
      key: "friction",
      label: "摩擦力 f",
      value: displayedScene.frictionForce,
      color: FORCE_COLORS.friction,
      description:
        mode === "measurement"
          ? `当前处于${displayedScene.frictionModeLabel}，摩擦力大小 ${formatNumber(displayedScene.frictionForce, 1)} N。真正记录实验数据时，使用的是匀速阶段的动摩擦 ${formatNumber(displayedScene.kineticFriction, 1)} N。`
          : mode === "manual-drag"
            ? `当前处于${displayedScene.frictionModeLabel}，摩擦力约为 ${formatNumber(displayedScene.frictionForce, 1)} N。轻拖时主要表现为静摩擦，拖动起来后会转成稳定动摩擦。`
          : `当前处于${displayedScene.frictionModeLabel}，摩擦力大小 ${formatNumber(displayedScene.frictionForce, 1)} N。若恒力不足，它会作为静摩擦完全抵消拉力；一旦滑动，就近似保持在动摩擦 ${formatNumber(displayedScene.kineticFriction, 1)} N。`,
    },
    {
      key: "net",
      label: "合力 R",
      value: Math.abs(displayedScene.netForce),
      color: FORCE_COLORS.net,
      description:
        Math.abs(displayedScene.netForce) < 0.01
          ? displayedScene.phase === "uniform" || displayedScene.phase === "complete"
            ? "匀速拉动阶段，拉力和摩擦力再次平衡，水平方向合力回到 0。"
            : "当前合力为 0，木块要么静止，要么保持匀速。"
          : mode === "measurement"
            ? `突破静摩擦时出现瞬时合力 ${formatNumber(displayedScene.netForce, 2)} N，因此木块开始从静止转入滑动。`
            : mode === "manual-drag"
              ? `手动拖动时，合力 ${formatNumber(displayedScene.netForce, 2)} N 会随着拖动速度实时变化。它越大，速度曲线抬升越快。`
            : `当前合力 ${formatNumber(displayedScene.netForce, 2)} N。它越大，加速度越大，速度与位移曲线抬升得越明显。`,
    },
  ];

  const latestRecord = runRecords[0] ?? null;
  const canBreakaway = constantPullForce > metrics.staticLimit;

  const visibleForces = {
    gravity: true,
    normal: true,
    pull: isManualMode ? manualHasPlaybackStarted : hasPlaybackStarted,
    friction: isManualMode ? manualHasPlaybackStarted : hasPlaybackStarted,
    net: isManualMode
      ? manualHasPlaybackStarted && Math.abs(manualCurrentTimelineSample.netForce) >= 0.01
      : hasPlaybackStarted,
  };

  const experimentStatus = isManualMode
    ? getManualExperimentStatus({
        metrics,
        sample: manualCurrentTimelineSample,
        isRecording: manualIsRecording,
        hasSamples: manualHasPlaybackStarted,
      })
    : getExperimentStatus({
        mode: mode === "measurement" ? "measurement" : "constant-pull",
        hasPlaybackStarted,
        displayedScene,
        metrics,
        progress,
        constantPullForce,
      });
  const activePhase = isManualMode
    ? !manualHasPlaybackStarted
      ? "idle"
      : manualIsRecording
        ? displayedScene.isMoving
          ? "accelerating"
          : "idle"
        : "complete"
    : hasPlaybackStarted
      ? displayedScene.phase
      : "idle";
  const hasPartialPlayback =
    !isManualMode && experimentElapsedMs > 0 && experimentElapsedMs < totalExperimentMs;
  const phaseSteps =
    mode === "measurement"
      ? [
          {
            phase: "idle" as const,
            label: "先预测",
            detail: "先看器材和变量",
            elapsedMs: 0,
            forceKey: "gravity" as const,
          },
          {
            phase: "ramping" as const,
            label: "拉力增大",
            detail: "静摩擦仍在平衡",
            elapsedMs: RAMP_DURATION_MS * 0.72,
            forceKey: "pull" as const,
          },
          {
            phase: "breakaway" as const,
            label: "刚刚起动",
            detail: "突破最大静摩擦",
            elapsedMs: RAMP_DURATION_MS + BREAKAWAY_DURATION_MS * 0.55,
            forceKey: "net" as const,
          },
          {
            phase: "uniform" as const,
            label: "匀速测量",
            detail: "稳定读数就是结果",
            elapsedMs: RAMP_DURATION_MS + BREAKAWAY_DURATION_MS + UNIFORM_DURATION_MS * 0.58,
            forceKey: "friction" as const,
          },
          {
            phase: "complete" as const,
            label: "得出结论",
            detail: "准备做下一组对比",
            elapsedMs: totalExperimentMs,
            forceKey: "friction" as const,
          },
        ]
      : mode === "manual-drag"
        ? [
            {
              phase: "idle" as const,
              label: "先判断",
              detail: "先点击开始记录",
              elapsedMs: 0,
              forceKey: "gravity" as const,
            },
            {
              phase: "accelerating" as const,
              label: "拖动观察",
              detail: "用拖动速度带出受力变化",
              elapsedMs: manualCurrentTimelineSample.timeMs,
              forceKey: "pull" as const,
            },
            {
              phase: "complete" as const,
              label: "完成判断",
              detail: "停止后对比图表变化",
              elapsedMs: manualCurrentTimelineSample.timeMs,
              forceKey: "friction" as const,
            },
          ]
      : canBreakaway
        ? [
            {
              phase: "idle" as const,
              label: "先判断",
              detail: "看恒力是否够大",
              elapsedMs: 0,
              forceKey: "gravity" as const,
            },
            {
              phase: "breakaway" as const,
              label: "开始起动",
              detail: "突破最大静摩擦",
              elapsedMs: CONSTANT_PULL_STARTUP_MS * 0.6,
              forceKey: "net" as const,
            },
            {
              phase: "accelerating" as const,
              label: "持续加速",
              detail: "合力保持为正",
              elapsedMs: CONSTANT_PULL_STARTUP_MS + CONSTANT_PULL_DURATION_MS * 0.5,
              forceKey: "net" as const,
            },
            {
              phase: "complete" as const,
              label: "完成演示",
              detail: "速度和位移都已建立",
              elapsedMs: totalExperimentMs,
              forceKey: "pull" as const,
            },
          ]
        : [
            {
              phase: "idle" as const,
              label: "先判断",
              detail: "看恒力是否够大",
              elapsedMs: 0,
              forceKey: "gravity" as const,
            },
            {
              phase: "stuck" as const,
              label: "保持静止",
              detail: "拉力未破阈值",
              elapsedMs: totalExperimentMs * 0.5,
              forceKey: "friction" as const,
            },
            {
              phase: "complete" as const,
              label: "完成判断",
              detail: "确认不会起动",
              elapsedMs: totalExperimentMs,
            forceKey: "friction" as const,
          },
        ];
  const primaryActionLabel = isManualMode
    ? manualIsRecording
      ? "停止记录"
      : manualHasPlaybackStarted
        ? "重新记录"
        : "开始记录"
    : isExperimentRunning
      ? "暂停实验"
      : hasPartialPlayback
        ? "继续播放"
        : hasPlaybackStarted
          ? "重新播放"
          : "开始实验";

  const horizontalMax = Math.max(
    metrics.breakawayForce,
    metrics.kineticFriction,
    constantPullForce,
    Math.abs(displayedScene.netForce),
    1,
  );
  const verticalMax = Math.max(displayedScene.weight, displayedScene.normal, 1);
  const currentModeLabel =
    FORCE_MODE_OPTIONS.find((item) => item.key === mode)?.label ?? "实验测量";
  const forceViewOptions =
    isManualMode ? FORCE_VIEW_OPTIONS.filter((item) => item.key === "2d") : FORCE_VIEW_OPTIONS;
  const forceGuideX = forceGraph.mapTime(currentTimelineSample.timeSeconds);
  const thresholdLineY = forceGraph.mapValue(metrics.staticLimit);
  const currentPullPoint = {
    x: forceGuideX,
    y: forceGraph.mapValue(currentTimelineSample.pullForce),
  };
  const currentFrictionPoint = {
    x: forceGuideX,
    y: frictionGraph.mapValue(currentTimelineSample.frictionForce),
  };
  const currentNetPoint = {
    x: forceGuideX,
    y: netGraph.mapValue(Math.max(0, currentTimelineSample.netForce)),
  };
  const motionGuideX = displacementGraph.mapTime(currentTimelineSample.timeSeconds);
  const currentDisplacementPoint = {
    x: motionGuideX,
    y: displacementGraph.mapValue(currentTimelineSample.displacement),
  };
  const currentVelocityPoint = {
    x: motionGuideX,
    y: velocityGraph.mapValue(currentTimelineSample.velocity),
  };

  function resetManualRecordingState() {
    setManualIsRecording(false);
    setManualIsDragging(false);
    setManualSeries([createIdleForceSample()]);
    manualDragRef.current = {
      active: false,
      pointerId: -1,
      pointerOffsetX: 0,
      startAtMs: 0,
      lastAtMs: 0,
      lastDisplacement: 0,
      lastVelocity: 0,
      lastTravelProgress: 0,
    };
  }

  function resetDefaults() {
    setMode(DEFAULT_VALUES.mode);
    setPressure(DEFAULT_VALUES.pressure);
    setConstantPullForce(DEFAULT_VALUES.constantPullForce);
    setSurfacePreset(DEFAULT_VALUES.surfacePreset);
    setContactArea(DEFAULT_VALUES.contactArea);
    setActiveForce("gravity");
    setHasExperimentRun(false);
    setIsExperimentRunning(false);
    setExperimentElapsedMs(0);
    resetManualRecordingState();
  }

  function startExperiment() {
    if (mode === "manual-drag") {
      const now = performance.now();
      setHasExperimentRun(false);
      setIsExperimentRunning(false);
      setExperimentElapsedMs(0);
      setActiveForce("gravity");
      setManualIsRecording(true);
      setManualIsDragging(false);
      setManualSeries([createIdleForceSample()]);
      manualDragRef.current = {
        active: false,
        pointerId: -1,
        pointerOffsetX: 0,
        startAtMs: now,
        lastAtMs: now,
        lastDisplacement: 0,
        lastVelocity: 0,
        lastTravelProgress: 0,
      };
      return;
    }

    setHasExperimentRun(true);
    setIsExperimentRunning(true);
    setExperimentElapsedMs(0);
    setCurrentRunId((previous) => previous + 1);
    setActiveForce(mode === "measurement" ? "pull" : canBreakaway ? "net" : "friction");
  }

  function pauseExperiment() {
    if (mode === "manual-drag") {
      finishManualDrag(performance.now(), true);
      return;
    }

    setIsExperimentRunning(false);
  }

  function resumeExperiment() {
    if (mode === "manual-drag") {
      startExperiment();
      return;
    }

    if (experimentElapsedMs <= 0 || experimentElapsedMs >= totalExperimentMs) {
      startExperiment();
      return;
    }

    setHasExperimentRun(true);
    setIsExperimentRunning(true);

    if (currentRunId === 0 || lastRecordedRunRef.current === currentRunId) {
      setCurrentRunId((previous) => previous + 1);
    }

    setActiveForce(getSuggestedForceForPhase(displayedScene.phase));
  }

  function seekExperiment(nextElapsedMs: number) {
    if (mode === "manual-drag") {
      return;
    }

    const clampedElapsedMs = Math.max(0, Math.min(totalExperimentMs, nextElapsedMs));

    setIsExperimentRunning(false);

    if (clampedElapsedMs === 0) {
      setHasExperimentRun(false);
      setExperimentElapsedMs(0);
      setActiveForce("gravity");
      return;
    }

    setHasExperimentRun(true);
    setExperimentElapsedMs(clampedElapsedMs);
    setActiveForce(
      getSuggestedForceForPhase(
        computeExperimentScene({
          mode,
          metrics,
          hasPlaybackStarted: true,
          experimentElapsedMs: clampedElapsedMs,
          totalExperimentMs,
          constantPullForce,
        }).phase,
      ),
    );
  }

  function jumpToPhase(phase: ExperimentPhase) {
    if (mode === "manual-drag") {
      if (phase === "idle") {
        resetManualRecordingState();
        setActiveForce("gravity");
      }

      return;
    }

    const targetStep = phaseSteps.find((item) => item.phase === phase);
    if (!targetStep) {
      return;
    }

    seekExperiment(targetStep.elapsedMs);
    setActiveForce(targetStep.forceKey);
  }

  function appendManualSample(nextSample: ForceTimelineSample) {
    setManualSeries((previous) => {
      const nextSeries = previous.length === 0 ? [createIdleForceSample()] : [...previous];
      const lastSample = nextSeries[nextSeries.length - 1];

      if (lastSample && Math.abs(lastSample.timeMs - nextSample.timeMs) <= 16) {
        nextSeries[nextSeries.length - 1] = nextSample;
      } else {
        nextSeries.push(nextSample);
      }

      return nextSeries.slice(-200);
    });
  }

  function finishManualDrag(timestampMs: number, shouldStopRecording: boolean) {
    if (!isManualMode) {
      return;
    }

    const dragState = manualDragRef.current;
    if (!manualIsRecording && !dragState.active) {
      return;
    }

    const elapsedMs =
      dragState.startAtMs > 0
        ? clamp(timestampMs - dragState.startAtMs, 0, MANUAL_TIMELINE_MAX_MS)
        : manualCurrentTimelineSample.timeMs;
    const stopSample: ForceTimelineSample = {
      timeMs: elapsedMs,
      timeSeconds: elapsedMs / 1000,
      phase: elapsedMs > 0 ? "complete" : "idle",
      pullForce: 0,
      frictionForce: 0,
      netForce: 0,
      displacement: dragState.lastDisplacement,
      velocity: 0,
      acceleration: 0,
    };

    appendManualSample(stopSample);
    setManualIsDragging(false);
    manualDragRef.current = {
      ...dragState,
      active: false,
      pointerId: -1,
      lastAtMs: timestampMs,
      lastVelocity: 0,
    };

    if (shouldStopRecording) {
      setManualIsRecording(false);
      setActiveForce("friction");
    }
  }

  function handleManualPointerDown(event: ReactPointerEvent<SVGGElement>) {
    if (!isManualMode || !manualIsRecording) {
      return;
    }

    const svgNode = forceStageSvgRef.current;
    if (!svgNode) {
      return;
    }

    const rect = svgNode.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * stage.width;
    const now = performance.now();

    manualDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      pointerOffsetX: pointerX - stage.blockX,
      startAtMs: manualDragRef.current.startAtMs || now,
      lastAtMs: now,
      lastDisplacement: currentTimelineSample.displacement,
      lastVelocity: currentTimelineSample.velocity,
      lastTravelProgress: displayedScene.travelProgress,
    };

    svgNode.setPointerCapture?.(event.pointerId);
    setManualIsDragging(true);
  }

  function handleManualPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!isManualMode || !manualIsRecording || !manualDragRef.current.active) {
      return;
    }

    const svgNode = forceStageSvgRef.current;
    if (!svgNode) {
      return;
    }

    const rect = svgNode.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    const pointerX = ((event.clientX - rect.left) / rect.width) * stage.width;
    const nextBlockX = clamp(
      pointerX - manualDragRef.current.pointerOffsetX,
      stage.startX,
      stage.startX + stage.maxTravel,
    );
    const nextTravelProgress = clamp01(
      stage.maxTravel <= 0 ? 0 : (nextBlockX - stage.startX) / stage.maxTravel,
    );
    const forwardTravelProgress = Math.max(
      manualDragRef.current.lastTravelProgress,
      nextTravelProgress,
    );
    const nextDisplacement = forwardTravelProgress * MANUAL_MAX_DISTANCE_METERS;
    const now = performance.now();
    const deltaSeconds = Math.max((now - manualDragRef.current.lastAtMs) / 1000, 1 / 120);
    const rawVelocity =
      (nextDisplacement - manualDragRef.current.lastDisplacement) / deltaSeconds;
    const velocity =
      Math.abs(rawVelocity) < MANUAL_SPEED_THRESHOLD
        ? 0
        : manualDragRef.current.lastVelocity * 0.24 + rawVelocity * 0.76;
    const acceleration =
      velocity === 0
        ? 0
        : (velocity - manualDragRef.current.lastVelocity) / deltaSeconds;

    let pullForce = 0;
    let frictionForce = 0;
    let netForce = 0;
    let phase: ExperimentPhase = "idle";

    if (velocity <= 0) {
      pullForce = clamp(
        (forwardTravelProgress / 0.16) * metrics.staticLimit,
        0,
        metrics.staticLimit,
      );
      frictionForce = pullForce;
      phase = forwardTravelProgress > 0.01 ? "ramping" : "idle";
    } else {
      frictionForce = metrics.kineticFriction;
      pullForce = clamp(
        frictionForce +
          velocity * 1.45 +
          Math.max(0, acceleration) * metrics.massEquivalent * 0.42,
        frictionForce,
        MANUAL_MAX_PULL_FORCE,
      );
      netForce = Math.max(0, pullForce - frictionForce);
      phase = acceleration > 0.08 ? "accelerating" : "uniform";
    }

    const elapsedMs = clamp(now - manualDragRef.current.startAtMs, 0, MANUAL_TIMELINE_MAX_MS);
    const nextSample: ForceTimelineSample = {
      timeMs: elapsedMs,
      timeSeconds: elapsedMs / 1000,
      phase,
      pullForce,
      frictionForce,
      netForce,
      displacement: nextDisplacement,
      velocity,
      acceleration,
    };

    appendManualSample(nextSample);
    manualDragRef.current = {
      ...manualDragRef.current,
      lastAtMs: now,
      lastDisplacement: nextDisplacement,
      lastVelocity: velocity,
      lastTravelProgress: forwardTravelProgress,
    };
    setActiveForce(
      netForce > 0.04 ? "net" : velocity > MANUAL_SPEED_THRESHOLD ? "pull" : "friction",
    );

    if (elapsedMs >= MANUAL_TIMELINE_MAX_MS) {
      finishManualDrag(now, true);
    }
  }

  function handleManualPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (!isManualMode || !manualDragRef.current.active) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(manualDragRef.current.pointerId);
    finishManualDrag(performance.now(), false);
  }

  return (
    <section ref={fullscreenRef} className="visual-shell force-lab-shell basic-force-lab-shell">
      <div
        className={
          isControlPanelCollapsed
            ? "force-lab-layout basic-force-lab-layout is-collapsed"
            : "force-lab-layout basic-force-lab-layout"
        }
      >
        <aside
          className={
            isControlPanelCollapsed
              ? "force-control-panel basic-force-control-panel is-collapsed"
              : "force-control-panel basic-force-control-panel"
          }
        >
          {isControlPanelCollapsed ? (
            <div className="force-panel-collapsed-shell">
              <button
                type="button"
                className="force-panel-toggle is-collapsed-only"
                onClick={() => setIsControlPanelCollapsed(false)}
                aria-label="展开控制面板"
                title="展开控制面板"
              >
                <PanelChevronIcon collapsed />
              </button>
            </div>
          ) : (
            <>
              <div className="force-control-header">
                <div className="force-control-title-block">
                  <h4 className="force-control-title">控制面板</h4>
                  <p className="force-control-copy">先改变量，再播放实验。</p>
                </div>
                <button
                  type="button"
                  className="force-panel-toggle"
                  onClick={() => setIsControlPanelCollapsed(true)}
                  aria-label="收起控制面板"
                  title="收起控制面板"
                >
                  <PanelChevronIcon collapsed={false} />
                </button>
              </div>

              <div className="force-control-scroll basic-force-control-scroll">
                <ControlPanelSection title="实验控制" hint="先预测，再播放，再对比" accent>
                  <ControlChipGroup
                    columns={3}
                    size="dense"
                    items={FORCE_MODE_OPTIONS.map((item) => ({
                      key: item.key,
                      label: item.label,
                      active: mode === item.key,
                      title: item.title,
                      onClick: () => setMode(item.key as ForceExperimentMode),
                    }))}
                  />

                  {mode === "constant-pull" ? (
                    <ControlRange
                      id="force-constant-pull"
                      label="恒定拉力"
                      unit="N"
                      min={0.2}
                      max={8}
                      step={0.1}
                      value={constantPullForce}
                      onChange={setConstantPullForce}
                    />
                  ) : null}

                  {mode === "manual-drag" ? (
                    <p className="force-inline-copy">
                      先点开始记录，再到右侧 2D 实验区拖动木块。拖动越快，拉力、合力和下方图表变化越明显。
                    </p>
                  ) : null}

                  <ControlStatusBar
                    items={[
                      <StatusPill key="state" tone={displayedScene.stateTone}>
                        {displayedScene.stateLabel}
                      </StatusPill>,
                      <StatusPill key="mode">{displayedScene.frictionModeLabel}</StatusPill>,
                      mode === "measurement" ? (
                        <StatusPill key="limit">f静,max {formatNumber(metrics.staticLimit, 1)} N</StatusPill>
                      ) : mode === "manual-drag" ? (
                        <StatusPill key="manual">拖动画布</StatusPill>
                      ) : (
                        <StatusPill key="pull">F恒 {formatNumber(constantPullForce, 1)} N</StatusPill>
                      ),
                    ]}
                  />

                  {mode === "manual-drag" ? (
                    <ControlRange
                      id="force-manual-progress"
                      label="记录时长"
                      unit="s"
                      min={0}
                      max={MANUAL_TIMELINE_MAX_MS / 1000}
                      step={0.1}
                      value={Math.min(manualCurrentTimelineSample.timeSeconds, MANUAL_TIMELINE_MAX_MS / 1000)}
                      valueFormatter={(value) => `${formatNumber(value, 1)} s`}
                      disabled
                      onChange={() => {}}
                    />
                  ) : (
                    <ControlRange
                      id="force-experiment-progress"
                      label="实验时间轴"
                      min={0}
                      max={totalExperimentMs}
                      step={10}
                      value={hasPlaybackStarted ? experimentElapsedMs : 0}
                      valueFormatter={(value) => `${formatNumber(value / 1000, 1)} s`}
                      onChange={seekExperiment}
                    />
                  )}

                  <div className="motion-action-row">
                    <ControlButton
                      variant="primary"
                      size="compact"
                      onClick={() => {
                        if (manualIsRecording || isExperimentRunning) {
                          pauseExperiment();
                          return;
                        }

                        if (!isManualMode && hasPartialPlayback) {
                          resumeExperiment();
                          return;
                        }

                        startExperiment();
                      }}
                    >
                      {primaryActionLabel}
                    </ControlButton>
                    <ControlButton size="compact" onClick={resetDefaults}>
                      重置
                    </ControlButton>
                  </div>
                </ControlPanelSection>

                <ControlPanelSection title="压力 / 正压力" hint="直接改变 N 的大小">
                  <ControlRange
                    id="force-pressure"
                    label="当前压力"
                    unit="N"
                    min={2}
                    max={10}
                    step={0.5}
                    value={pressure}
                    onChange={setPressure}
                  />

                  <div className="force-insight-grid force-insight-grid-compact">
                    <article className="force-insight-card">
                      <span className="force-insight-label">等效质量</span>
                      <strong className="force-insight-value">{formatNumber(metrics.massEquivalent, 2)} kg</strong>
                    </article>
                    <article className="force-insight-card">
                      <span className="force-insight-label">理论滑动摩擦</span>
                      <strong className="force-insight-value">{formatNumber(metrics.kineticFriction, 1)} N</strong>
                    </article>
                  </div>
                </ControlPanelSection>

                <ControlPanelSection title="接触材质" hint="改变摩擦系数 μ">
                  <ControlChipGroup
                    items={SURFACE_PRESETS.map((preset) => ({
                      key: preset.key,
                      label: preset.label,
                      active: surfacePreset === preset.key,
                      onClick: () => setSurfacePreset(preset.key),
                    }))}
                    columns={2}
                  />
                </ControlPanelSection>

                <ControlPanelSection title="摆放方式" hint="验证面积是否进入公式">
                  <ControlChipGroup
                    items={CONTACT_AREAS.map((item) => ({
                      key: item.key,
                      label: item.label,
                      active: contactArea === item.key,
                      onClick: () => setContactArea(item.key),
                    }))}
                    columns={3}
                  />
                </ControlPanelSection>
              </div>
            </>
          )}
        </aside>

        <div className="force-lab-main">
          <div
            ref={stageCanvasRef}
            className={
              viewMode === "3d"
                ? "visual-canvas force-stage-canvas is-3d-mode"
                : "visual-canvas force-stage-canvas is-2d-mode"
            }
          >
            <button
              type="button"
              onClick={() => {
                void onToggleFullscreen();
              }}
              className="fullscreen-button is-floating"
              aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
              title={isFullscreen ? "退出全屏" : "进入全屏"}
            >
              {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
            </button>
            <VisualModeSwitch
              className="force-stage-view-switch"
              value={viewMode}
              options={forceViewOptions}
              onChange={(nextValue) => setViewMode(nextValue as ForceViewMode)}
            />
            <ControlStepGroup
              className="force-stage-overlay is-top-center force-stage-stepbar"
              items={phaseSteps.map((step, index) => ({
                key: step.phase,
                label: step.label,
                stepLabel: String(index + 1),
                title: step.detail,
                active: activePhase === step.phase,
                ariaLabel: `阶段 ${index + 1}：${step.label}`,
                onClick: () => jumpToPhase(step.phase),
              }))}
            />
            <div className="visual-grid-layer" />
            <div className="visual-glow visual-glow-a" />
            <div className="visual-glow visual-glow-b" />

            {viewMode === "2d" ? (
              <svg
                ref={forceStageSvgRef}
                viewBox={`0 0 ${stage.width} ${stage.height}`}
                className={
                  manualIsRecording
                    ? "force-stage-svg is-manual-ready"
                    : "force-stage-svg"
                }
                role="img"
                aria-label="滑动摩擦实验可视化示意图"
                onPointerMove={handleManualPointerMove}
                onPointerUp={handleManualPointerUp}
                onPointerLeave={handleManualPointerUp}
              >
                <defs>
                  <ArrowMarker id="force-arrow-gravity" color={FORCE_COLORS.gravity} />
                  <ArrowMarker id="force-arrow-normal" color={FORCE_COLORS.normal} />
                  <ArrowMarker id="force-arrow-pull" color={FORCE_COLORS.pull} />
                  <ArrowMarker id="force-arrow-friction" color={FORCE_COLORS.friction} />
                  <ArrowMarker id="force-arrow-net" color={FORCE_COLORS.net} />
                </defs>

                <rect
                  x={stage.panelX}
                  y={stage.panelY}
                  width={stage.panelWidth}
                  height={stage.scenePanelHeight}
                  rx="28"
                  className="motion-stage-panel-shell"
                />
                <text x={stage.panelX + 28} y={stage.panelY + 36} className="force-scene-inline-title">
                  {experimentStatus.label}
                </text>
                <g transform={`translate(${stage.panelX + 184}, ${stage.panelY + 18})`}>
                  <rect width="116" height="30" rx="15" className="force-scene-inline-badge" />
                  <text x="58" y="20" textAnchor="middle" className="force-scene-inline-badge-copy">
                    {experimentStatus.badge}
                  </text>
                </g>
                <g transform={`translate(${stage.panelX + 28}, ${stage.panelY + 60})`}>
                  <rect width="284" height="6" rx="3" className="force-scene-inline-progress-track" />
                  <rect
                    width={284 * experimentStatus.progress}
                    height="6"
                    rx="3"
                    className="force-scene-inline-progress-fill"
                  />
                </g>
                {(() => {
                  const chipLabels = [
                    surfacePresetMeta.label,
                    contactAreaMeta.label,
                    `压力 ${formatNumber(pressure, 1)} N`,
                  ];
                  let cursorX = stage.panelX + 28;

                  return chipLabels.map((label) => {
                    const width = getPillWidth(label);
                    const node = (
                      <g key={label} transform={`translate(${cursorX}, ${stage.panelY + 84})`}>
                        <rect width={width} height="28" rx="14" className="force-scene-inline-pill" />
                        <text x={width / 2} y="18" textAnchor="middle" className="force-scene-inline-pill-copy">
                          {label}
                        </text>
                      </g>
                    );
                    cursorX += width + 10;
                    return node;
                  });
                })()}
                <g transform={`translate(${stage.panelX + stage.panelWidth - 254}, ${stage.panelY + 24})`}>
                  <rect width="226" height="76" rx="18" className="force-scene-metric-card" />
                  <text x="18" y="26" className="force-scene-metric-line">
                    s = {formatNumber(displayedScene.displacement, 2)} m · v = {formatNumber(displayedScene.velocity, 2)} m/s
                  </text>
                  <text x="18" y="48" className="force-scene-metric-line">
                    F = {formatNumber(displayedScene.pullForce, 1)} N · f = {formatNumber(displayedScene.frictionForce, 1)} N
                  </text>
                  <text x="18" y="70" className="force-scene-metric-line is-accent">
                    R = {formatNumber(displayedScene.netForce, 2)} N · a = {formatNumber(displayedScene.acceleration, 2)} m/s²
                  </text>
                </g>

                <rect
                  x={stage.panelX + 28}
                  y={stage.groundY - 10}
                  width={stage.panelWidth - 56}
                  height="24"
                  rx="12"
                  className="force-stage-surface-strip"
                  fill={surfacePresetMeta.strip}
                  stroke={surfacePresetMeta.accent}
                  strokeOpacity="0.4"
                />

                {buildSurfaceTexture({
                  startX: stage.panelX + 24,
                  endX: stage.panelX + stage.panelWidth - 24,
                  groundY: stage.groundY,
                  accent: surfacePresetMeta.accent,
                  roughness: surfacePresetMeta.roughness,
                })}

                <line
                  x1={stage.panelX + 24}
                  y1={stage.groundY}
                  x2={stage.panelX + stage.panelWidth - 24}
                  y2={stage.groundY}
                  className="force-stage-ground"
                />
                <text x={stage.panelX + 28} y={stage.groundY - 18} className="force-svg-caption">
                  {surfacePresetMeta.label}
                </text>
                <text x={stage.panelX + 28} y={stage.groundY + 44} className="force-svg-caption">
                  {contactAreaMeta.label} · 压力 {formatNumber(pressure, 1)} N
                </text>

                <g className="force-stage-trail">
                  <line
                    x1={stage.startCenterX}
                    y1={stage.groundY + 30}
                    x2={stage.centerX}
                    y2={stage.groundY + 30}
                  />
                  <circle cx={stage.startCenterX} cy={stage.groundY + 30} r="5" />
                  <circle cx={stage.centerX} cy={stage.groundY + 30} r="5" className="motion-stage-origin-dot" />
                  <text x={stage.startCenterX - 20} y={stage.groundY + 54} className="force-svg-caption">
                    起点
                  </text>
                  <text x={stage.centerX + 10} y={stage.groundY + 54} className="force-svg-caption">
                    {formatNumber(displayedScene.displacement, 2)} m
                  </text>
                </g>

                <g transform={`translate(${stage.springX}, ${stage.springY})`}>
                  <rect width="138" height="62" rx="18" className="force-stage-scale-body" />
                  <rect x="18" y="16" width="84" height="14" rx="7" className="force-stage-scale-track" />
                  <rect
                    x="18"
                    y="16"
                    width={84 * displayedScene.readingRatio}
                    height="14"
                    rx="7"
                    className="force-stage-scale-fill"
                    fill={surfacePresetMeta.accent}
                  />
                  <rect x="18" y="36" width="84" height="12" rx="6" className="force-stage-scale-window" />
                  <text x="60" y="46" textAnchor="middle" className="force-stage-scale-reading">
                    {formatNumber(displayedScene.pullForce, 1)} N
                  </text>
                  <rect x="108" y="20" width="24" height="22" rx="10" className="force-stage-scale-head" />
                  <line x1="132" y1="31" x2="154" y2="31" className="force-stage-scale-hook" />
                  <text x="69" y="80" textAnchor="middle" className="force-svg-caption">
                    {mode === "measurement"
                      ? "弹簧测力计"
                      : mode === "manual-drag"
                        ? "手动拉动端"
                        : "恒力输入端"}
                  </text>
                </g>

                <line
                  x1={stage.ropeStartX}
                  y1={stage.centerY}
                  x2={stage.ropeEndX}
                  y2={stage.centerY}
                  className="force-stage-rope"
                />

                <ellipse
                  cx={stage.centerX}
                  cy={stage.groundY + 12}
                  rx={stage.blockWidth * 0.7}
                  ry="18"
                  className="force-stage-shadow"
                />

                <g
                  transform={`translate(${stage.blockX}, ${stage.blockY})`}
                  className={
                    isManualMode
                      ? manualIsDragging
                        ? "force-stage-block-group is-manual-drag is-dragging"
                        : "force-stage-block-group is-manual-drag"
                      : "force-stage-block-group"
                  }
                  onPointerDown={handleManualPointerDown}
                >
                  <rect
                    width={stage.blockWidth}
                    height={stage.blockHeight}
                    rx="22"
                    className={isExperimentRunning ? "force-stage-block is-focused" : "force-stage-block"}
                  />
                  <rect
                    x="14"
                    y="14"
                    width={stage.blockWidth - 28}
                    height={stage.blockHeight - 28}
                    rx="16"
                    className={isExperimentRunning ? "force-stage-block-inner is-focused" : "force-stage-block-inner"}
                  />
                  <text
                    x={stage.blockWidth / 2}
                    y={stage.blockHeight / 2 - 8}
                    textAnchor="middle"
                    className="force-svg-title"
                  >
                    木块
                  </text>
                  <text
                    x={stage.blockWidth / 2}
                    y={stage.blockHeight / 2 + 18}
                    textAnchor="middle"
                    className="force-svg-copy"
                  >
                    {contactAreaMeta.label}
                  </text>

                  {stage.weightSlots.map((slot, index) => (
                    <g key={`${slot.x}-${slot.y}-${index}`} transform={`translate(${slot.x}, ${slot.y})`}>
                      <rect width="30" height="18" rx="6" className="force-stage-weight" />
                      <rect x="8" y="-6" width="14" height="7" rx="3.5" className="force-stage-weight-top" />
                    </g>
                  ))}
                </g>

                {visibleForces.gravity ? (
                  <ForceVector
                    id="force-arrow-gravity"
                    color={FORCE_COLORS.gravity}
                    label="G"
                    magnitude={displayedScene.weight}
                    direction="down"
                    anchorX={stage.centerX}
                    anchorY={stage.centerY + 18}
                    length={scaleArrow(displayedScene.weight, verticalMax)}
                    isActive={activeForce === "gravity"}
                    onActivate={() => setActiveForce("gravity")}
                  />
                ) : null}

                {visibleForces.normal ? (
                  <ForceVector
                    id="force-arrow-normal"
                    color={FORCE_COLORS.normal}
                    label="N"
                    magnitude={displayedScene.normal}
                    direction="up"
                    anchorX={stage.centerX}
                    anchorY={stage.centerY - 18}
                    length={scaleArrow(displayedScene.normal, verticalMax)}
                    isActive={activeForce === "normal"}
                    onActivate={() => setActiveForce("normal")}
                  />
                ) : null}

                {visibleForces.pull ? (
                  <ForceVector
                    id="force-arrow-pull"
                    color={FORCE_COLORS.pull}
                    label="F"
                    magnitude={displayedScene.pullForce}
                    direction="right"
                    anchorX={stage.blockX + stage.blockWidth}
                    anchorY={stage.centerY - 6}
                    length={scaleArrow(displayedScene.pullForce, horizontalMax)}
                    isActive={activeForce === "pull"}
                    onActivate={() => setActiveForce("pull")}
                  />
                ) : null}

                {visibleForces.friction ? (
                  <ForceVector
                    id="force-arrow-friction"
                    color={FORCE_COLORS.friction}
                    label="f"
                    magnitude={displayedScene.frictionForce}
                    direction="left"
                    anchorX={stage.blockX}
                    anchorY={stage.centerY + 28}
                    length={scaleArrow(displayedScene.frictionForce, horizontalMax)}
                    isActive={activeForce === "friction"}
                    onActivate={() => setActiveForce("friction")}
                  />
                ) : null}

                {visibleForces.net && Math.abs(displayedScene.netForce) >= 0.01 ? (
                  <ForceVector
                    id="force-arrow-net"
                    color={FORCE_COLORS.net}
                    label="R"
                    magnitude={Math.abs(displayedScene.netForce)}
                    direction="right"
                    anchorX={stage.blockX + stage.blockWidth}
                    anchorY={stage.blockY - 26}
                    length={scaleArrow(Math.abs(displayedScene.netForce), horizontalMax)}
                    isActive={activeForce === "net"}
                    onActivate={() => setActiveForce("net")}
                  />
                ) : null}

                <rect
                  x={stage.panelX}
                  y={stage.graphY}
                  width={stage.graphWidth}
                  height={stage.graphHeight}
                  rx="28"
                  className="motion-stage-graph-shell"
                />
                <text x={stage.panelX + 28} y={stage.graphY + 34} className="motion-stage-panel-title">
                  受力 - 时间
                  <tspan className="motion-stage-panel-note-inline">（拉力 / 摩擦力 / 合力）</tspan>
                </text>
                <g transform={`translate(${stage.panelX + stage.graphWidth - 178}, ${stage.graphY + 26})`}>
                  {[
                    { label: "F拉", color: FORCE_COLORS.pull, offset: 0 },
                    { label: "f", color: FORCE_COLORS.friction, offset: 58 },
                    { label: "R", color: FORCE_COLORS.net, offset: 108 },
                  ].map(({ label, color, offset }) => (
                    <g key={label} transform={`translate(${offset}, 0)`}>
                      <circle cx="0" cy="0" r="5" fill={color} />
                      <text x="10" y="4" className="motion-stage-graph-axis-label">
                        {label}
                      </text>
                    </g>
                  ))}
                </g>

                {Array.from({ length: 5 }).map((_, index) => {
                  const ratio = index / 4;
                  const y =
                    stage.graphY +
                    FORCE_GRAPH_PADDING.top +
                    (stage.graphHeight - FORCE_GRAPH_PADDING.top - FORCE_GRAPH_PADDING.bottom) * ratio;
                  const value = forceDomain * (1 - ratio);

                  return (
                    <g key={`force-grid-${index}`}>
                      <line
                        x1={stage.panelX + FORCE_GRAPH_PADDING.left}
                        y1={y}
                        x2={stage.panelX + stage.graphWidth - FORCE_GRAPH_PADDING.right}
                        y2={y}
                        className="motion-stage-graph-grid"
                      />
                      <text
                        x={stage.panelX + 18}
                        y={y + 4}
                        textAnchor="start"
                        className="motion-stage-graph-axis-label"
                      >
                        {formatNumber(value, 1)}
                      </text>
                    </g>
                  );
                })}

                {graphTimeTicks.map((tickValue, index) => {
                  const x = forceGraph.mapTime(tickValue);

                  return (
                    <g key={`force-time-${index}`}>
                      <line
                        x1={x}
                        y1={stage.graphY + FORCE_GRAPH_PADDING.top}
                        x2={x}
                        y2={stage.graphY + stage.graphHeight - FORCE_GRAPH_PADDING.bottom}
                        className="motion-stage-graph-grid"
                      />
                      <text
                        x={x}
                        y={stage.graphY + stage.graphHeight - 10}
                        textAnchor="middle"
                        className="motion-stage-graph-axis-label"
                      >
                        {formatTimeLabel(tickValue)}
                      </text>
                    </g>
                  );
                })}

                <line
                  x1={stage.panelX + FORCE_GRAPH_PADDING.left}
                  y1={thresholdLineY}
                  x2={stage.panelX + stage.graphWidth - FORCE_GRAPH_PADDING.right}
                  y2={thresholdLineY}
                  className="motion-stage-stop-line"
                />
                <text
                  x={stage.panelX + stage.graphWidth - FORCE_GRAPH_PADDING.right - 6}
                  y={thresholdLineY - 10}
                  textAnchor="end"
                  className="motion-stage-stop-label"
                >
                  f静,max
                </text>

                <polyline
                  points={forceGraph.fullPolyline}
                  className="motion-stage-graph-line is-muted"
                  style={{ stroke: FORCE_COLORS.pull }}
                />
                <polyline
                  points={forceGraph.playedPolyline}
                  className="motion-stage-graph-line"
                  style={{ stroke: FORCE_COLORS.pull }}
                />
                <polyline
                  points={frictionGraph.fullPolyline}
                  className="motion-stage-graph-line is-muted"
                  style={{ stroke: FORCE_COLORS.friction }}
                />
                <polyline
                  points={frictionGraph.playedPolyline}
                  className="motion-stage-graph-line"
                  style={{ stroke: FORCE_COLORS.friction }}
                />
                <polyline
                  points={netGraph.fullPolyline}
                  className="motion-stage-graph-line is-muted"
                  style={{ stroke: FORCE_COLORS.net }}
                />
                <polyline
                  points={netGraph.playedPolyline}
                  className="motion-stage-graph-line"
                  style={{ stroke: FORCE_COLORS.net }}
                />
                <line
                  x1={forceGuideX}
                  y1={stage.graphY + FORCE_GRAPH_PADDING.top}
                  x2={forceGuideX}
                  y2={stage.graphY + stage.graphHeight - FORCE_GRAPH_PADDING.bottom}
                  className="motion-stage-guide-line is-chart"
                />
                <circle cx={currentPullPoint.x} cy={currentPullPoint.y} r="5.5" fill={FORCE_COLORS.pull} className="motion-stage-graph-point" />
                <circle cx={currentFrictionPoint.x} cy={currentFrictionPoint.y} r="5.5" fill={FORCE_COLORS.friction} className="motion-stage-graph-point" />
                <circle cx={currentNetPoint.x} cy={currentNetPoint.y} r="5.5" fill={FORCE_COLORS.net} className="motion-stage-graph-point" />

                <rect
                  x={motionGraphX}
                  y={stage.graphY}
                  width={stage.graphWidth}
                  height={stage.graphHeight}
                  rx="28"
                  className="motion-stage-graph-shell"
                />
                <text x={motionGraphX + 28} y={stage.graphY + 34} className="motion-stage-panel-title">
                  位移 / 速度 - 时间
                  <tspan className="motion-stage-panel-note-inline">（左轴位移，右轴速度）</tspan>
                </text>
                <g transform={`translate(${motionGraphX + stage.graphWidth - 126}, ${stage.graphY + 26})`}>
                  {[
                    { label: "位移", color: "#7bc1ff", offset: 0 },
                    { label: "速度", color: "#5de2b1", offset: 72 },
                  ].map(({ label, color, offset }) => (
                    <g key={label} transform={`translate(${offset}, 0)`}>
                      <circle cx="0" cy="0" r="5" fill={color} />
                      <text x="10" y="4" className="motion-stage-graph-axis-label">
                        {label}
                      </text>
                    </g>
                  ))}
                </g>

                {Array.from({ length: 5 }).map((_, index) => {
                  const ratio = index / 4;
                  const y =
                    stage.graphY +
                    FORCE_GRAPH_PADDING.top +
                    (stage.graphHeight - FORCE_GRAPH_PADDING.top - FORCE_GRAPH_PADDING.bottom) * ratio;
                  const displacementValue = displacementDomain * (1 - ratio);
                  const velocityValue = velocityDomain * (1 - ratio);

                  return (
                    <g key={`motion-grid-${index}`}>
                      <line
                        x1={motionGraphX + FORCE_GRAPH_PADDING.left}
                        y1={y}
                        x2={motionGraphX + stage.graphWidth - FORCE_GRAPH_PADDING.right}
                        y2={y}
                        className="motion-stage-graph-grid"
                      />
                      <text
                        x={motionGraphX + 18}
                        y={y + 4}
                        textAnchor="start"
                        className="motion-stage-graph-axis-label"
                      >
                        {formatNumber(displacementValue, 1)}
                      </text>
                      <text
                        x={motionGraphX + stage.graphWidth - 18}
                        y={y + 4}
                        textAnchor="end"
                        className="motion-stage-graph-axis-label"
                      >
                        {formatNumber(velocityValue, 1)}
                      </text>
                    </g>
                  );
                })}

                {graphTimeTicks.map((tickValue, index) => {
                  const x = displacementGraph.mapTime(tickValue);

                  return (
                    <g key={`motion-time-${index}`}>
                      <line
                        x1={x}
                        y1={stage.graphY + FORCE_GRAPH_PADDING.top}
                        x2={x}
                        y2={stage.graphY + stage.graphHeight - FORCE_GRAPH_PADDING.bottom}
                        className="motion-stage-graph-grid"
                      />
                      <text
                        x={x}
                        y={stage.graphY + stage.graphHeight - 10}
                        textAnchor="middle"
                        className="motion-stage-graph-axis-label"
                      >
                        {formatTimeLabel(tickValue)}
                      </text>
                    </g>
                  );
                })}

                <path
                  d={displacementGraph.fullAreaPath}
                  className="motion-stage-graph-area"
                  fill="rgba(123, 193, 255, 0.18)"
                />
                <polyline
                  points={displacementGraph.fullPolyline}
                  className="motion-stage-graph-line is-muted"
                  style={{ stroke: "#7bc1ff" }}
                />
                <polyline
                  points={displacementGraph.playedPolyline}
                  className="motion-stage-graph-line"
                  style={{ stroke: "#7bc1ff" }}
                />
                <polyline
                  points={velocityGraph.fullPolyline}
                  className="motion-stage-graph-line is-secondary-muted"
                  style={{ stroke: "#5de2b1" }}
                />
                <polyline
                  points={velocityGraph.playedPolyline}
                  className="motion-stage-graph-line is-secondary"
                  style={{ stroke: "#5de2b1" }}
                />
                <line
                  x1={motionGuideX}
                  y1={stage.graphY + FORCE_GRAPH_PADDING.top}
                  x2={motionGuideX}
                  y2={stage.graphY + stage.graphHeight - FORCE_GRAPH_PADDING.bottom}
                  className="motion-stage-guide-line is-chart"
                />
                <circle
                  cx={currentDisplacementPoint.x}
                  cy={currentDisplacementPoint.y}
                  r="6"
                  className="motion-stage-graph-point"
                  fill="#7bc1ff"
                />
                <circle
                  cx={currentVelocityPoint.x}
                  cy={currentVelocityPoint.y}
                  r="6"
                  className="motion-stage-graph-point is-secondary"
                  fill="#5de2b1"
                />
              </svg>
            ) : (
              <BasicForceThreeStage
                activeForce={activeForce}
                contactArea={{
                  key: contactArea,
                  label: contactAreaMeta.label,
                  blockWidth: contactAreaMeta.blockWidth,
                  blockHeight: contactAreaMeta.blockHeight,
                }}
                isExperimentRunning={isExperimentRunning}
                pressure={pressure}
                scene={{
                  frictionForce: displayedScene.frictionForce,
                  kineticFriction: displayedScene.kineticFriction,
                  netForce: displayedScene.netForce,
                  normal: displayedScene.normal,
                  phase: displayedScene.phase,
                  pullForce: displayedScene.pullForce,
                  readingRatio: displayedScene.readingRatio,
                  travelProgress: displayedScene.travelProgress,
                  weight: displayedScene.weight,
                }}
                surface={{
                  accent: surfacePresetMeta.accent,
                  label: surfacePresetMeta.label,
                  roughness: surfacePresetMeta.roughness,
                }}
                visibleForces={visibleForces}
              />
            )}
            {viewMode === "3d" ? (
              <>
                <div className="force-stage-overlay is-top-left">
                  <div className="force-stage-hud-card">
                    <div className="force-stage-hud-head">
                      <span className="force-stage-hud-title">{experimentStatus.label}</span>
                      <StatusPill tone={displayedScene.stateTone}>{experimentStatus.badge}</StatusPill>
                    </div>
                    <div className="force-stage-progress-inline">
                      <span style={{ width: `${experimentStatus.progress * 100}%` }} />
                    </div>
                    <div className="force-stage-chip-row">
                      <span className="force-stage-chip">{currentModeLabel}</span>
                      <span className="force-stage-chip">{surfacePresetMeta.label}</span>
                      <span className="force-stage-chip">{contactAreaMeta.label}</span>
                      <span className="force-stage-chip">压力 {formatNumber(pressure, 1)} N</span>
                      <span className="force-stage-chip">左拖旋转 · 滚轮缩放</span>
                    </div>
                  </div>
                </div>

                <div className="force-stage-overlay is-bottom-left">
                  <div className="force-stage-chip-grid">
                    {forceRows.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={item.key === activeForce ? "force-stage-force-pill is-active" : "force-stage-force-pill"}
                        onClick={() => setActiveForce(item.key)}
                      >
                        <span className="force-stage-force-pill-head">
                          <span
                            className="force-legend-swatch"
                            style={{ backgroundColor: item.color }}
                            aria-hidden="true"
                          />
                          <span>{item.label}</span>
                        </span>
                        <strong>{formatNumber(item.value, 1)} N</strong>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="force-stage-overlay is-bottom-right">
                  <div className="force-stage-hud-card is-tight">
                    <div className="force-stage-chip-row">
                      <span className="force-stage-chip">μs {formatNumber(surfacePresetMeta.muStatic, 2)}</span>
                      <span className="force-stage-chip">μk {formatNumber(surfacePresetMeta.muKinetic, 2)}</span>
                      {mode === "constant-pull" ? (
                        <span className="force-stage-chip">F恒 {formatNumber(constantPullForce, 1)} N</span>
                      ) : null}
                    </div>
                    <div className="force-stage-chip-row">
                      <span className="force-stage-chip">s {formatNumber(displayedScene.displacement, 2)} m</span>
                      <span className="force-stage-chip">v {formatNumber(displayedScene.velocity, 2)} m/s</span>
                      <span className="force-stage-chip">a {formatNumber(displayedScene.acceleration, 2)} m/s²</span>
                    </div>
                    <div className="force-stage-result-pill">
                      <strong>
                        {mode === "measurement"
                          ? latestRecord
                            ? `${formatNumber(latestRecord.kineticFriction, 1)} N`
                            : "等待稳定读数"
                          : `${formatNumber(displayedScene.netForce, 2)} N`}
                      </strong>
                      <span>
                        {mode === "measurement"
                          ? latestRecord
                            ? `${latestRecord.surfaceLabel} · 压力 ${formatNumber(latestRecord.pressure, 1)} N · ${latestRecord.contactAreaLabel}`
                            : "完成一次实验后记录匀速阶段读数"
                          : canBreakaway
                            ? `恒定拉力已超过静摩擦阈值，当前木块持续加速前进。`
                            : `恒定拉力未超过最大静摩擦，木块保持静止。`}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function readStoredForceViewMode(): ForceViewMode {
  if (typeof window === "undefined") {
    return "2d";
  }

  return window.localStorage.getItem(FORCE_VIEW_STORAGE_KEY) === "3d"
    ? "3d"
    : "2d";
}

function readStoredForcePanelCollapsed() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(FORCE_PANEL_COLLAPSED_STORAGE_KEY) === "1";
}

type ForceVectorProps = {
  id: string;
  color: string;
  label: string;
  magnitude: number;
  direction: "left" | "right" | "up" | "down";
  anchorX: number;
  anchorY: number;
  length: number;
  isActive: boolean;
  onActivate: () => void;
};

function ForceVector({
  id,
  color,
  label,
  magnitude,
  direction,
  anchorX,
  anchorY,
  length,
  isActive,
  onActivate,
}: ForceVectorProps) {
  if (magnitude < 0.01) {
    return null;
  }

  let endX = anchorX;
  let endY = anchorY;

  if (direction === "right") {
    endX += length;
  }

  if (direction === "left") {
    endX -= length;
  }

  if (direction === "up") {
    endY -= length;
  }

  if (direction === "down") {
    endY += length;
  }

  const caption = `${label} ${formatNumber(magnitude, 1)}N`;
  const captionMetrics = getLabelMetrics(direction, anchorX, anchorY, endX, endY, caption);

  return (
    <g
      className={isActive ? "force-vector is-active" : "force-vector"}
      onClick={onActivate}
      onMouseEnter={onActivate}
      onFocus={onActivate}
    >
      <line
        x1={anchorX}
        y1={anchorY}
        x2={endX}
        y2={endY}
        className="force-vector-hit"
      />
      <line
        x1={anchorX}
        y1={anchorY}
        x2={endX}
        y2={endY}
        stroke={color}
        strokeWidth={isActive ? 4 : 3}
        strokeLinecap="round"
        markerEnd={`url(#${id})`}
      />
      <g transform={`translate(${captionMetrics.x}, ${captionMetrics.y})`}>
        <rect
          width={captionMetrics.width}
          height="28"
          rx="14"
          fill="rgba(7, 17, 31, 0.92)"
          stroke={color}
          strokeOpacity={isActive ? 0.92 : 0.42}
        />
        <text
          x={captionMetrics.width / 2}
          y="18"
          textAnchor="middle"
          className="force-vector-label"
          fill={color}
        >
          {caption}
        </text>
      </g>
    </g>
  );
}

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 12 12"
      refX="10"
      refY="6"
      markerWidth="9"
      markerHeight="9"
      orient="auto-start-reverse"
    >
      <path d="M0,0 L12,6 L0,12 z" fill={color} />
    </marker>
  );
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
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
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
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
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

function getExperimentStatus({
  mode,
  hasPlaybackStarted,
  displayedScene,
  metrics,
  progress,
  constantPullForce,
}: {
  mode: ForceExperimentMode;
  hasPlaybackStarted: boolean;
  displayedScene: ExperimentScene;
  metrics: ExperimentMetrics;
  progress: number;
  constantPullForce: number;
}): ExperimentStatus {
  if (!hasPlaybackStarted) {
    if (mode === "measurement") {
      return {
        phase: "idle",
        label: "等待开始实验",
        badge: "待播放",
        description: "点击开始后，先慢慢增大拉力，再观察突破静摩擦后的稳定读数。",
        formula: `预测：f = μkN = ${formatNumber(metrics.kineticFriction / metrics.normal, 2)} × ${formatNumber(metrics.normal, 1)} = ${formatNumber(metrics.kineticFriction, 1)} N`,
        progress: 0,
      };
    }

    const predictedNetForce = Math.max(0, constantPullForce - metrics.kineticFriction);
    const predictedAcceleration = predictedNetForce / metrics.massEquivalent;

    return {
      phase: "idle",
      label: "等待开始演示",
      badge: constantPullForce > metrics.staticLimit ? "可起动" : "拉力不足",
      description:
        constantPullForce > metrics.staticLimit
          ? "这组恒定拉力已经超过最大静摩擦，播放后会直接进入起动和加速。"
          : "这组恒定拉力还不够大，播放后会保持静止，用来对比静摩擦阈值。",
      formula:
        constantPullForce > metrics.staticLimit
          ? `预测：R = F恒 - f动 = ${formatNumber(constantPullForce, 1)} - ${formatNumber(metrics.kineticFriction, 1)} = ${formatNumber(predictedNetForce, 2)} N，a = ${formatNumber(predictedAcceleration, 2)} m/s²`
          : `预测：F恒 = ${formatNumber(constantPullForce, 1)} N ≤ f静,max = ${formatNumber(metrics.staticLimit, 1)} N，木块不会起动`,
      progress: 0,
    };
  }

  if (mode === "measurement") {
    switch (displayedScene.phase) {
      case "ramping":
        return {
          phase: "ramping",
          label: "拉力逐步增大",
          badge: "准备起动",
          description: `当前读数 ${formatNumber(displayedScene.pullForce, 1)} N。木块还没滑动，静摩擦会持续抵消拉力，直到逼近 ${formatNumber(metrics.staticLimit, 1)} N。`,
          formula: `静止阶段：F拉 = f静 ≤ f静,max = ${formatNumber(metrics.staticLimit, 1)} N`,
          progress,
        };
      case "breakaway":
        return {
          phase: "breakaway",
          label: "刚突破静摩擦",
          badge: "开始滑动",
          description: "拉力第一次超过最大静摩擦，木块由静止转入滑动，速度开始建立。",
          formula: `起动瞬间：F拉 > f静,max，当前合力 ${formatNumber(displayedScene.netForce, 2)} N`,
          progress,
        };
      case "uniform":
        return {
          phase: "uniform",
          label: "正在匀速测量",
          badge: "稳定读数",
          description: `木块已经进入匀速滑动，当前稳定读数 ${formatNumber(metrics.kineticFriction, 1)} N，就是本次测得的滑动摩擦力。`,
          formula: `匀速阶段：F拉 = f = μkN = ${formatNumber(metrics.kineticFriction / metrics.normal, 2)} × ${formatNumber(metrics.normal, 1)} = ${formatNumber(metrics.kineticFriction, 1)} N`,
          progress,
        };
      case "complete":
        return {
          phase: "complete",
          label: "实验完成",
          badge: "已记录结果",
          description: "稳定读数已经建立，可以继续切换材质、压力或摆放方式，观察对结果的影响。",
          formula: `结论：滑动摩擦力 ${formatNumber(metrics.kineticFriction, 1)} N，接触面积不进入公式 f = μkN`,
          progress: 1,
        };
      default:
        return {
          phase: displayedScene.phase,
          label: "等待开始实验",
          badge: "待播放",
          description: "先观察器材和变量，再开始实验。",
          formula: `预测：f = μkN = ${formatNumber(metrics.kineticFriction / metrics.normal, 2)} × ${formatNumber(metrics.normal, 1)} = ${formatNumber(metrics.kineticFriction, 1)} N`,
          progress,
        };
    }
  }

  switch (displayedScene.phase) {
    case "stuck":
      return {
        phase: "stuck",
        label: "木块保持静止",
        badge: "拉力不足",
        description: "恒定拉力还没有超过最大静摩擦，木块不会起动，位移和速度都保持为 0。",
        formula: `F恒 = ${formatNumber(constantPullForce, 1)} N ≤ f静,max = ${formatNumber(metrics.staticLimit, 1)} N，当前 R = 0`,
        progress,
      };
    case "breakaway":
      return {
        phase: "breakaway",
        label: "木块开始起动",
        badge: "突破阈值",
        description: "恒定拉力已经超过静摩擦阈值，木块刚开始启动，下方曲线会从这里抬升。",
        formula: `R = F恒 - f动 = ${formatNumber(constantPullForce, 1)} - ${formatNumber(metrics.kineticFriction, 1)} = ${formatNumber(displayedScene.netForce, 2)} N`,
        progress,
      };
    case "accelerating":
      return {
        phase: "accelerating",
        label: "木块持续加速",
        badge: "合力为正",
        description: "此时恒定拉力和动摩擦都基本稳定，所以合力近似恒定，加速度也近似恒定。",
        formula: `a = R / m = ${formatNumber(displayedScene.netForce, 2)} / ${formatNumber(metrics.massEquivalent, 2)} = ${formatNumber(displayedScene.acceleration, 2)} m/s²`,
        progress,
      };
    case "complete":
      return {
        phase: "complete",
        label: constantPullForce > metrics.staticLimit ? "演示完成" : "完成判断",
        badge: constantPullForce > metrics.staticLimit ? "已建立轨迹" : "确认静止",
        description:
          constantPullForce > metrics.staticLimit
            ? "这组恒定拉力下的速度与位移轨迹已经形成，可以继续调整拉力做对比。"
            : "这组恒定拉力无法突破最大静摩擦，结果是保持静止。",
        formula:
          constantPullForce > metrics.staticLimit
            ? `终点：s = ${formatNumber(displayedScene.displacement, 2)} m，v = ${formatNumber(displayedScene.velocity, 2)} m/s`
            : `结论：F恒 = ${formatNumber(constantPullForce, 1)} N 仍小于 f静,max = ${formatNumber(metrics.staticLimit, 1)} N`,
        progress: 1,
      };
    default:
      return {
        phase: "idle",
        label: "等待开始演示",
        badge: "待播放",
        description: "先判断恒定拉力与最大静摩擦的大小关系。",
        formula: `F恒 = ${formatNumber(constantPullForce, 1)} N，f静,max = ${formatNumber(metrics.staticLimit, 1)} N`,
        progress,
      };
  }
}

function createIdleForceSample(): ForceTimelineSample {
  return {
    timeMs: 0,
    timeSeconds: 0,
    phase: "idle",
    pullForce: 0,
    frictionForce: 0,
    netForce: 0,
    displacement: 0,
    velocity: 0,
    acceleration: 0,
  };
}

function getManualExperimentStatus({
  metrics,
  sample,
  isRecording,
  hasSamples,
}: {
  metrics: ExperimentMetrics;
  sample: ForceTimelineSample;
  isRecording: boolean;
  hasSamples: boolean;
}): ExperimentStatus {
  if (!hasSamples) {
    return {
      phase: "idle",
      label: "等待手动拖动",
      badge: "待记录",
      description: "点击开始记录后，直接在 2D 实验区拖动木块，用拖动速度观察力值和图表变化。",
      formula: `参考阈值：f静,max = ${formatNumber(metrics.staticLimit, 1)} N，f动 = ${formatNumber(metrics.kineticFriction, 1)} N`,
      progress: 0,
    };
  }

  if (isRecording) {
    return {
      phase: sample.phase,
      label: sample.velocity > MANUAL_SPEED_THRESHOLD ? "手动拖动中" : "准备发力",
      badge: sample.velocity > MANUAL_SPEED_THRESHOLD ? "实时记录" : "轻推观察",
      description:
        sample.velocity > MANUAL_SPEED_THRESHOLD
          ? "当前拖动速度已经带出明显受力变化，下方曲线会实时记录拉力、摩擦力、合力、位移和速度。"
          : "先轻轻拉动，观察静摩擦如何抵消拉力；继续加快拖动，木块就会进入滑动。",
      formula: `当前：F ≈ ${formatNumber(sample.pullForce, 1)} N，f ≈ ${formatNumber(sample.frictionForce, 1)} N，R ≈ ${formatNumber(sample.netForce, 2)} N`,
      progress: clamp01(sample.timeMs / MANUAL_TIMELINE_MAX_MS),
    };
  }

  return {
    phase: "complete",
    label: "已完成记录",
    badge: "可对比图表",
    description: "可以重新记录一组新的拖动，再对比不同拖动速度下的受力、位移和速度曲线。",
    formula: `终点：s = ${formatNumber(sample.displacement, 2)} m，v = ${formatNumber(sample.velocity, 2)} m/s`,
    progress: clamp01(sample.timeMs / MANUAL_TIMELINE_MAX_MS),
  };
}

function buildManualExperimentScene({
  metrics,
  sample,
  isRecording,
}: {
  metrics: ExperimentMetrics;
  sample: ForceTimelineSample;
  isRecording: boolean;
}): ExperimentScene {
  const isMoving = sample.velocity > MANUAL_SPEED_THRESHOLD;
  const phase =
    sample.timeMs <= 0
      ? "idle"
      : !isRecording
        ? "complete"
        : isMoving
          ? sample.acceleration > 0.08
            ? "accelerating"
            : "uniform"
          : sample.pullForce > 0
            ? "ramping"
            : "idle";

  return {
    phase,
    weight: metrics.weight,
    normal: metrics.normal,
    pullForce: sample.pullForce,
    frictionForce: sample.frictionForce,
    netForce: sample.netForce,
    acceleration: sample.acceleration,
    staticLimit: metrics.staticLimit,
    kineticFriction: metrics.kineticFriction,
    frictionModeLabel: isMoving
      ? "手动滑动"
      : sample.pullForce > 0
        ? "静摩擦响应"
        : "等待拖动",
    stateLabel: !isRecording
      ? sample.timeMs > 0
        ? "记录暂停"
        : "等待记录"
      : isMoving
        ? "拖动中"
        : "轻推观察",
    stateTone: !isRecording ? "balanced" : isMoving ? "active" : "warning",
    motionState: isMoving ? "sliding" : "rest",
    isMoving,
    summary: isMoving
      ? "拖动速度越快，拉力和合力变化越明显，下方图表会实时记录。"
      : "先轻推木块，观察静摩擦如何随手动输入一起变化。",
    motionHint: isMoving
      ? "继续拖动可对比不同速度下的曲线抬升速度。"
      : "当拖动速度更大时，木块会更容易进入滑动状态。",
    travelProgress:
      MANUAL_MAX_DISTANCE_METERS <= 0
        ? 0
        : clamp01(sample.displacement / MANUAL_MAX_DISTANCE_METERS),
    readingRatio: clamp01(sample.pullForce / Math.max(MANUAL_MAX_PULL_FORCE, metrics.breakawayForce)),
    displacement: sample.displacement,
    velocity: sample.velocity,
  };
}

function computeExperimentMetrics({
  pressure,
  muStatic,
  muKinetic,
}: {
  pressure: number;
  muStatic: number;
  muKinetic: number;
}): ExperimentMetrics {
  const normal = pressure;
  const weight = pressure;
  const massEquivalent = weight / GRAVITY;
  const staticLimit = muStatic * normal;
  const kineticFriction = muKinetic * normal;
  const breakawayForce = Math.max(staticLimit + 0.25, kineticFriction + 0.35);

  return {
    massEquivalent,
    pressure,
    weight,
    normal,
    staticLimit,
    kineticFriction,
    breakawayForce,
  };
}

function computeExperimentScene({
  mode,
  metrics,
  hasPlaybackStarted,
  experimentElapsedMs,
  totalExperimentMs,
  constantPullForce,
}: {
  mode: ForceExperimentMode;
  metrics: ExperimentMetrics;
  hasPlaybackStarted: boolean;
  experimentElapsedMs: number;
  totalExperimentMs: number;
  constantPullForce: number;
}): ExperimentScene {
  if (!hasPlaybackStarted || experimentElapsedMs <= 0) {
    return {
      phase: "idle",
      weight: metrics.weight,
      normal: metrics.normal,
      pullForce: 0,
      frictionForce: 0,
      netForce: 0,
      acceleration: 0,
      staticLimit: metrics.staticLimit,
      kineticFriction: metrics.kineticFriction,
      frictionModeLabel: mode === "measurement" ? "静摩擦待命" : "等待判断",
      stateLabel: mode === "measurement" ? "等待测量" : "等待演示",
      stateTone: "balanced",
      motionState: "rest",
      isMoving: false,
      summary:
        mode === "measurement"
          ? "先观察器材和变量，再开始测量最大静摩擦与稳定动摩擦。"
          : "先判断恒定拉力能否突破最大静摩擦，再观察位移和速度变化。",
      motionHint:
        mode === "measurement"
          ? "这个实验真正要记录的是匀速阶段的稳定读数。"
          : "若恒定拉力不够大，位移和速度都会保持在 0。",
      travelProgress: 0,
      readingRatio: 0,
      displacement: 0,
      velocity: 0,
    };
  }

  if (mode === "measurement") {
    const gaugeMax = Math.max(metrics.breakawayForce, 0.4);
    const breakawayMotion = resolveMeasurementMotion({
      metrics,
      experimentElapsedMs,
    });

    if (experimentElapsedMs < RAMP_DURATION_MS) {
      const progress = clamp01(experimentElapsedMs / RAMP_DURATION_MS);
      const pullForce = metrics.breakawayForce * easeOutCubic(progress);
      const frictionForce = Math.min(pullForce, metrics.staticLimit);
      const nearThreshold = pullForce >= metrics.staticLimit * 0.88;

      return {
        phase: "ramping",
        weight: metrics.weight,
        normal: metrics.normal,
        pullForce,
        frictionForce,
        netForce: 0,
        acceleration: 0,
        staticLimit: metrics.staticLimit,
        kineticFriction: metrics.kineticFriction,
        frictionModeLabel: nearThreshold ? "接近最大静摩擦" : "静摩擦平衡",
        stateLabel: nearThreshold ? "接近起动" : "仍未滑动",
        stateTone: nearThreshold ? "warning" : "balanced",
        motionState: nearThreshold ? "threshold" : "rest",
        isMoving: false,
        summary: "拉力在变大，但静摩擦仍然完全抵消它，木块保持静止。",
        motionHint: "等到拉力第一次超过最大静摩擦时，木块才会开始滑动。",
        travelProgress: 0,
        readingRatio: clamp01(pullForce / gaugeMax),
        displacement: 0,
        velocity: 0,
      };
    }

    if (experimentElapsedMs < RAMP_DURATION_MS + BREAKAWAY_DURATION_MS) {
      const progress = clamp01((experimentElapsedMs - RAMP_DURATION_MS) / BREAKAWAY_DURATION_MS);
      const pullForce = lerp(metrics.breakawayForce, metrics.kineticFriction, easeInOutCubic(progress));
      const frictionForce = metrics.kineticFriction;
      const netForce = Math.max(0, pullForce - frictionForce);

      return {
        phase: "breakaway",
        weight: metrics.weight,
        normal: metrics.normal,
        pullForce,
        frictionForce,
        netForce,
        acceleration: netForce / metrics.massEquivalent,
        staticLimit: metrics.staticLimit,
        kineticFriction: metrics.kineticFriction,
        frictionModeLabel: "动摩擦接管",
        stateLabel: "开始滑动",
        stateTone: "active",
        motionState: "sliding",
        isMoving: true,
        summary: "木块刚突破最大静摩擦，速度开始建立，位移曲线从这里离开 0。",
        motionHint: "继续观察，合力会回落到 0，木块随后进入匀速滑动。",
        travelProgress: breakawayMotion.totalDistance <= 0 ? 0 : clamp01(breakawayMotion.displacement / breakawayMotion.totalDistance),
        readingRatio: clamp01(pullForce / gaugeMax),
        displacement: breakawayMotion.displacement,
        velocity: breakawayMotion.velocity,
      };
    }

    const uniformElapsedSeconds = clamp(
      experimentElapsedMs - RAMP_DURATION_MS - BREAKAWAY_DURATION_MS,
      0,
      UNIFORM_DURATION_MS,
    ) / 1000;
    const displacement =
      breakawayMotion.breakawayEndDisplacement +
      breakawayMotion.breakawayEndVelocity * uniformElapsedSeconds;

    if (experimentElapsedMs < totalExperimentMs) {
      return {
        phase: "uniform",
        weight: metrics.weight,
        normal: metrics.normal,
        pullForce: metrics.kineticFriction,
        frictionForce: metrics.kineticFriction,
        netForce: 0,
        acceleration: 0,
        staticLimit: metrics.staticLimit,
        kineticFriction: metrics.kineticFriction,
        frictionModeLabel: "匀速动摩擦",
        stateLabel: "匀速滑动",
        stateTone: "active",
        motionState: "sliding",
        isMoving: true,
        summary: "木块已经进入匀速运动，这时的稳定读数就是实验结果。",
        motionHint: "对照下方曲线：此时受力重新平衡，位移继续线性增加。",
        travelProgress: breakawayMotion.totalDistance <= 0 ? 0 : clamp01(displacement / breakawayMotion.totalDistance),
        readingRatio: clamp01(metrics.kineticFriction / gaugeMax),
        displacement,
        velocity: breakawayMotion.breakawayEndVelocity,
      };
    }

    return {
      phase: "complete",
      weight: metrics.weight,
      normal: metrics.normal,
      pullForce: metrics.kineticFriction,
      frictionForce: metrics.kineticFriction,
      netForce: 0,
      acceleration: 0,
      staticLimit: metrics.staticLimit,
      kineticFriction: metrics.kineticFriction,
      frictionModeLabel: "匀速动摩擦",
      stateLabel: "测量完成",
      stateTone: "balanced",
      motionState: "sliding",
      isMoving: true,
      summary: "本次实验已经完成，可以保留这次读数，再换材质、压力或摆放方式做对照。",
      motionHint: "最值得比较的是稳定读数随材质和压力的变化。",
      travelProgress: 1,
      readingRatio: clamp01(metrics.kineticFriction / gaugeMax),
      displacement: breakawayMotion.totalDistance,
      velocity: breakawayMotion.breakawayEndVelocity,
    };
  }

  const gaugeMax = Math.max(metrics.breakawayForce, constantPullForce, 0.4);

  if (constantPullForce <= metrics.staticLimit) {
    const isComplete = experimentElapsedMs >= totalExperimentMs;

    return {
      phase: isComplete ? "complete" : "stuck",
      weight: metrics.weight,
      normal: metrics.normal,
      pullForce: constantPullForce,
      frictionForce: constantPullForce,
      netForce: 0,
      acceleration: 0,
      staticLimit: metrics.staticLimit,
      kineticFriction: metrics.kineticFriction,
      frictionModeLabel: "静摩擦平衡",
      stateLabel: isComplete ? "判断完成" : "仍然静止",
      stateTone: isComplete ? "balanced" : "warning",
      motionState: "rest",
      isMoving: false,
      summary: "恒定拉力没有超过最大静摩擦，所以木块始终不会起动。",
      motionHint: "这条实验用来帮助理解：并不是有拉力就一定会运动，先要突破静摩擦阈值。",
      travelProgress: 0,
      readingRatio: clamp01(constantPullForce / gaugeMax),
      displacement: 0,
      velocity: 0,
    };
  }

  const elapsedSeconds = clamp(experimentElapsedMs, 0, totalExperimentMs) / 1000;
  const totalSeconds = totalExperimentMs / 1000;
  const netForce = Math.max(0, constantPullForce - metrics.kineticFriction);
  const acceleration = netForce / metrics.massEquivalent;
  const displacement = 0.5 * acceleration * elapsedSeconds * elapsedSeconds;
  const velocity = acceleration * elapsedSeconds;
  const totalDistance = 0.5 * acceleration * totalSeconds * totalSeconds;
  const phase =
    experimentElapsedMs < CONSTANT_PULL_STARTUP_MS
      ? "breakaway"
      : experimentElapsedMs < totalExperimentMs
        ? "accelerating"
        : "complete";

  return {
    phase,
    weight: metrics.weight,
    normal: metrics.normal,
    pullForce: constantPullForce,
    frictionForce: metrics.kineticFriction,
    netForce,
    acceleration,
    staticLimit: metrics.staticLimit,
    kineticFriction: metrics.kineticFriction,
    frictionModeLabel: phase === "breakaway" ? "刚突破静摩擦" : "稳定动摩擦",
    stateLabel:
      phase === "breakaway"
        ? "开始起动"
        : phase === "accelerating"
          ? "持续加速"
          : "演示完成",
    stateTone: phase === "complete" ? "balanced" : "active",
    motionState: "sliding",
    isMoving: true,
    summary:
      phase === "breakaway"
        ? "恒定拉力已经超过阈值，木块刚开始启动。"
        : "这组恒定拉力和动摩擦都保持稳定，所以木块会持续加速前进。",
    motionHint:
      phase === "breakaway"
        ? "看下方曲线：从这一刻开始，位移和速度都不再是 0。"
        : "速度 - 时间图会近似直线上升，位移 - 时间图会越来越陡。",
    travelProgress: totalDistance <= 0 ? 0 : clamp01(displacement / totalDistance),
    readingRatio: clamp01(constantPullForce / gaugeMax),
    displacement: phase === "complete" ? totalDistance : displacement,
    velocity: phase === "complete" ? acceleration * totalSeconds : velocity,
  };
}

function resolveMeasurementMotion({
  metrics,
  experimentElapsedMs,
}: {
  metrics: ExperimentMetrics;
  experimentElapsedMs: number;
}) {
  const breakawayElapsedMs = clamp(
    experimentElapsedMs - RAMP_DURATION_MS,
    0,
    BREAKAWAY_DURATION_MS,
  );
  const breakawayCurrent = integrateMeasurementBreakaway({
    metrics,
    elapsedMs: breakawayElapsedMs,
  });
  const breakawayEnd = integrateMeasurementBreakaway({
    metrics,
    elapsedMs: BREAKAWAY_DURATION_MS,
  });
  const uniformElapsedSeconds = clamp(
    experimentElapsedMs - RAMP_DURATION_MS - BREAKAWAY_DURATION_MS,
    0,
    UNIFORM_DURATION_MS,
  ) / 1000;
  const totalDistance =
    breakawayEnd.displacement +
    breakawayEnd.velocity * (UNIFORM_DURATION_MS / 1000);

  if (experimentElapsedMs < RAMP_DURATION_MS + BREAKAWAY_DURATION_MS) {
    return {
      displacement: breakawayCurrent.displacement,
      velocity: breakawayCurrent.velocity,
      totalDistance,
      breakawayEndVelocity: breakawayEnd.velocity,
      breakawayEndDisplacement: breakawayEnd.displacement,
    };
  }

  return {
    displacement:
      breakawayEnd.displacement + breakawayEnd.velocity * uniformElapsedSeconds,
    velocity: breakawayEnd.velocity,
    totalDistance,
    breakawayEndVelocity: breakawayEnd.velocity,
    breakawayEndDisplacement: breakawayEnd.displacement,
  };
}

function integrateMeasurementBreakaway({
  metrics,
  elapsedMs,
}: {
  metrics: ExperimentMetrics;
  elapsedMs: number;
}) {
  const clampedElapsedMs = clamp(elapsedMs, 0, BREAKAWAY_DURATION_MS);
  if (clampedElapsedMs <= 0) {
    return { displacement: 0, velocity: 0 };
  }

  const stepCount = Math.max(1, Math.ceil(clampedElapsedMs / 24));
  const totalSeconds = clampedElapsedMs / 1000;
  const dt = totalSeconds / stepCount;
  let displacement = 0;
  let velocity = 0;

  for (let index = 0; index < stepCount; index += 1) {
    const sampleProgress =
      (((index + 0.5) / stepCount) * clampedElapsedMs) / BREAKAWAY_DURATION_MS;
    const pullForce = lerp(
      metrics.breakawayForce,
      metrics.kineticFriction,
      easeInOutCubic(sampleProgress),
    );
    const netForce = Math.max(0, pullForce - metrics.kineticFriction);
    const acceleration = netForce / metrics.massEquivalent;
    displacement += velocity * dt + 0.5 * acceleration * dt * dt;
    velocity += acceleration * dt;
  }

  return { displacement, velocity };
}

function buildForceTimelineSeries({
  mode,
  metrics,
  totalExperimentMs,
  constantPullForce,
  segments,
}: {
  mode: ForceExperimentMode;
  metrics: ExperimentMetrics;
  totalExperimentMs: number;
  constantPullForce: number;
  segments: number;
}) {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const timeMs = (totalExperimentMs * index) / segments;
    const scene = computeExperimentScene({
      mode,
      metrics,
      hasPlaybackStarted: true,
      experimentElapsedMs: timeMs,
      totalExperimentMs,
      constantPullForce,
    });

    return {
      timeMs,
      timeSeconds: timeMs / 1000,
      phase: scene.phase,
      pullForce: scene.pullForce,
      frictionForce: scene.frictionForce,
      netForce: scene.netForce,
      displacement: scene.displacement,
      velocity: scene.velocity,
      acceleration: scene.acceleration,
    };
  });
}

function buildPlayedForceSeries({
  series,
  currentSample,
}: {
  series: ForceTimelineSample[];
  currentSample: ForceTimelineSample;
}) {
  const played = series.filter((sample) => sample.timeSeconds < currentSample.timeSeconds);
  const lastPlayed = played[played.length - 1];

  if (!lastPlayed || Math.abs(lastPlayed.timeSeconds - currentSample.timeSeconds) > 0.0001) {
    played.push(currentSample);
  }

  return played.length === 0 ? [currentSample] : played;
}

function buildForceGraphGeometry({
  series,
  playedSeries,
  width,
  height,
  x,
  y,
  duration,
  minValue,
  maxValue,
  mapValue,
}: {
  series: ForceTimelineSample[];
  playedSeries: ForceTimelineSample[];
  width: number;
  height: number;
  x: number;
  y: number;
  duration: number;
  minValue: number;
  maxValue: number;
  mapValue: (sample: ForceTimelineSample) => number;
}) {
  const plotWidth = width - FORCE_GRAPH_PADDING.left - FORCE_GRAPH_PADDING.right;
  const plotHeight = height - FORCE_GRAPH_PADDING.top - FORCE_GRAPH_PADDING.bottom;
  const valueSpan = maxValue - minValue || 1;
  const mapTime = (time: number) =>
    x + FORCE_GRAPH_PADDING.left + (duration === 0 ? 0 : (time / duration) * plotWidth);
  const valueMapper = (value: number) =>
    y + FORCE_GRAPH_PADDING.top + (1 - (value - minValue) / valueSpan) * plotHeight;
  const fullPoints = series.map((sample) => ({
    x: mapTime(sample.timeSeconds),
    y: valueMapper(mapValue(sample)),
  }));

  return {
    mapTime,
    mapValue: valueMapper,
    fullPolyline: fullPoints.map((point) => `${point.x},${point.y}`).join(" "),
    playedPolyline: playedSeries
      .map((sample) => `${mapTime(sample.timeSeconds)},${valueMapper(mapValue(sample))}`)
      .join(" "),
    fullAreaPath: buildForceAreaPath({
      points: fullPoints,
      baselineY: y + FORCE_GRAPH_PADDING.top + plotHeight,
    }),
  };
}

function buildForceAreaPath({
  points,
  baselineY,
}: {
  points: Array<{ x: number; y: number }>;
  baselineY: number;
}) {
  if (points.length === 0) {
    return "";
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return `M ${firstPoint.x} ${baselineY} ${points
    .map((point) => `L ${point.x} ${point.y}`)
    .join(" ")} L ${lastPoint.x} ${baselineY} Z`;
}

function computeStageLayout({
  contactAreaMeta,
  travelProgress,
  pressure,
  frameAspect,
}: {
  contactAreaMeta: ContactAreaPreset;
  travelProgress: number;
  pressure: number;
  frameAspect: number;
}): StageLayout {
  const width = clamp(
    Math.round(FORCE_SVG_STAGE.height * Math.max(frameAspect, FORCE_SVG_STAGE.minWidth / FORCE_SVG_STAGE.height)),
    FORCE_SVG_STAGE.minWidth,
    FORCE_SVG_STAGE.maxWidth,
  );
  const height = FORCE_SVG_STAGE.height;
  const panelX = FORCE_SVG_STAGE.panelX;
  const panelY = FORCE_SVG_STAGE.panelY;
  const panelWidth = width - panelX * 2;
  const scenePanelHeight = FORCE_SVG_STAGE.scenePanelHeight;
  const graphY = FORCE_SVG_STAGE.graphY;
  const graphGap = FORCE_SVG_STAGE.graphGap;
  const graphHeight = FORCE_SVG_STAGE.graphHeight;
  const graphWidth = (panelWidth - graphGap) / 2;
  const groundY = FORCE_SVG_STAGE.sceneGroundY;
  const sceneLeft = FORCE_SVG_STAGE.sceneInset;
  const sceneRight = width - FORCE_SVG_STAGE.sceneInset;
  const springX = sceneRight - 176;
  const springY = groundY - 96;
  const ropeEndX = springX + 154;
  const blockWidth = contactAreaMeta.blockWidth;
  const blockHeight = contactAreaMeta.blockHeight;
  const startX = sceneLeft + 118;
  const maxTravel = Math.max(180, ropeEndX - startX - blockWidth - 72);
  const travel = maxTravel * travelProgress;
  const blockX = startX + travel;
  const blockY = groundY - blockHeight - 18;
  const centerX = blockX + blockWidth / 2;
  const centerY = blockY + blockHeight / 2;
  const ropeStartX = blockX + blockWidth;
  const weightCount = Math.max(0, Math.round((pressure - 2) / 2));
  const perRow = blockWidth >= 140 ? 2 : 1;
  const weightSlots = Array.from({ length: weightCount }, (_, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const totalRowWidth = perRow * 36 - 6;

    return {
      x: blockWidth / 2 - totalRowWidth / 2 + col * 36,
      y: -24 - row * 26,
    };
  });

  return {
    width,
    height,
    panelX,
    panelY,
    panelWidth,
    scenePanelHeight,
    graphY,
    graphWidth,
    graphHeight,
    graphGap,
    groundY,
    blockX,
    blockY,
    blockWidth,
    blockHeight,
    centerX,
    centerY,
    startX,
    maxTravel,
    travel,
    startCenterX: startX + blockWidth / 2,
    springX,
    springY,
    ropeStartX,
    ropeEndX,
    weightSlots,
  };
}

function buildSurfaceTexture({
  startX,
  endX,
  groundY,
  accent,
  roughness,
}: {
  startX: number;
  endX: number;
  groundY: number;
  accent: string;
  roughness: number;
}) {
  const span = Math.max(1, endX - startX);
  const lines = Array.from({ length: 18 }, (_, index) => {
    const x = startX + 16 + ((span - 40) * index) / 17;
    const height = 4 + (index % 3) * roughness * 3.4;

    return (
      <line
        key={`${x}-${height}`}
        x1={x}
        y1={groundY - 2}
        x2={x + 10}
        y2={groundY - height}
        className="force-stage-surface-mark"
        stroke={accent}
      />
    );
  });

  return (
    <g aria-hidden="true">
      {lines}
      <line
        x1={startX}
        y1={groundY + 18}
        x2={endX}
        y2={groundY + 18}
        className="force-stage-surface-shadow"
        stroke={accent}
      />
    </g>
  );
}

function scaleArrow(magnitude: number, maxMagnitude: number) {
  if (magnitude <= 0) {
    return 0;
  }

  return 40 + (magnitude / maxMagnitude) * 68;
}

function getSuggestedForceForPhase(phase: ExperimentPhase): ForceKey {
  switch (phase) {
    case "ramping":
      return "pull";
    case "breakaway":
    case "accelerating":
      return "net";
    case "stuck":
      return "friction";
    case "uniform":
    case "complete":
      return "friction";
    default:
      return "gravity";
  }
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - ((-2 * value + 2) ** 3) / 2;
}

function formatTimeLabel(value: number) {
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)}s`;
}

function getLabelMetrics(
  direction: "left" | "right" | "up" | "down",
  anchorX: number,
  anchorY: number,
  endX: number,
  endY: number,
  text: string,
) {
  const width = Math.max(62, text.length * 8.2 + 18);

  if (direction === "right") {
    return { x: endX + 10, y: endY - 14, width };
  }

  if (direction === "left") {
    return { x: endX - width - 10, y: endY - 14, width };
  }

  if (direction === "up") {
    return { x: anchorX + 18, y: endY - 14, width };
  }

  return { x: anchorX + 18, y: endY - 14, width };
}

function getPillWidth(label: string) {
  return Math.max(54, label.length * 12 + 22);
}

function formatNumber(value: number, digits: number) {
  const fixed = value.toFixed(digits);
  return fixed.replace(/\.0+$|(\.\d*[1-9])0+$/, "$1");
}
