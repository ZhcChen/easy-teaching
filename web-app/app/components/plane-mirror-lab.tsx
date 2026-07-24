import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

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

type PlaneMirrorLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type MirrorStepKey = "locate-image" | "equal-distance" | "virtual-image" | "symmetry";
type ObservationState = "idle" | "observing" | "stable";
type DragTarget = "object" | "comparison" | "screen";
type TimerId = ReturnType<typeof setInterval>;

type MirrorStepPreset = {
  key: MirrorStepKey;
  stepLabel: string;
  label: string;
  summary: string;
  focus: string;
  objectDistance: number;
  objectHeight: number;
  comparisonOffset: number;
  screenOffset: number;
  showRays: boolean;
  showSymmetry: boolean;
  showComparisonCandle: boolean;
  showScreen: boolean;
};

type MirrorRecord = {
  key: MirrorStepKey;
  value: string;
  note: string;
};

type MirrorSummaryItem = {
  label: string;
  value: string;
};

type MirrorScene = {
  objectX: number;
  imageX: number;
  comparisonX: number;
  screenX: number;
  objectTopY: number;
  imageTopY: number;
  mirrorTopY: number;
  mirrorBottomY: number;
  helperLineY: number;
  incidentRays: Array<{
    incidentPath: string;
    reflectedPath: string;
    extensionPath: string;
  }>;
};

const PANEL_COLLAPSED_STORAGE_KEY = "easy-teaching.plane-mirror.panel-collapsed";
const OBSERVATION_TICK_MS = 40;
const OBSERVATION_DURATION_MS = 960;
const OBJECT_DISTANCE_MIN = 5;
const OBJECT_DISTANCE_MAX = 30;
const OBJECT_HEIGHT_MIN = 10;
const OBJECT_HEIGHT_MAX = 22;
const DISTANCE_SCALE_PX = 13.2;
const HEIGHT_SCALE_PX = 10.2;
const OFFSET_LIMIT_CM = 8;
const STEP_SEQUENCE: MirrorStepKey[] = [
  "locate-image",
  "equal-distance",
  "virtual-image",
  "symmetry",
];

const STEP_PRESETS: Record<MirrorStepKey, MirrorStepPreset> = {
  "locate-image": {
    key: "locate-image",
    stepLabel: "1",
    label: "找像定位",
    summary: "移动镜后蜡烛 B，直到它与镜中的像完全重合，用重合法确定像的位置。",
    focus: "玻璃板能同时看到像和镜后的蜡烛 B，所以可以用“完全重合”来确定像点。",
    objectDistance: 12,
    objectHeight: 16,
    comparisonOffset: 3,
    screenOffset: 5,
    showRays: true,
    showSymmetry: false,
    showComparisonCandle: true,
    showScreen: false,
  },
  "equal-distance": {
    key: "equal-distance",
    stepLabel: "2",
    label: "等距等大",
    summary: "改变物距和物高，观察像距始终等于物距，像高始终等于物高。",
    focus: "无论物体离镜面多远、物体有多高，平面镜都成等大的像，并且像距始终等于物距。",
    objectDistance: 18,
    objectHeight: 18,
    comparisonOffset: 0,
    screenOffset: 5,
    showRays: false,
    showSymmetry: true,
    showComparisonCandle: false,
    showScreen: false,
  },
  "virtual-image": {
    key: "virtual-image",
    stepLabel: "3",
    label: "虚像验证",
    summary: "把光屏移到像的位置，屏上仍旧没有像，说明平面镜成的是虚像。",
    focus: "平面镜后的像不是实际光线会聚形成的，所以放上光屏也接不到像。",
    objectDistance: 14,
    objectHeight: 16,
    comparisonOffset: 0,
    screenOffset: 4,
    showRays: true,
    showSymmetry: false,
    showComparisonCandle: false,
    showScreen: true,
  },
  symmetry: {
    key: "symmetry",
    stepLabel: "4",
    label: "对称关系",
    summary: "连接物点和像点，观察连线始终垂直镜面，物像关于镜面对称。",
    focus: "物像关于镜面对称，物点与像点的连线总是垂直于镜面。",
    objectDistance: 20,
    objectHeight: 18,
    comparisonOffset: 0,
    screenOffset: 5,
    showRays: false,
    showSymmetry: true,
    showComparisonCandle: false,
    showScreen: false,
  },
};

const SVG_STAGE = {
  width: 1160,
  height: 760,
  panelX: 56,
  panelY: 86,
  panelWidth: 1048,
  panelHeight: 572,
  mirrorX: 580,
  mirrorTopY: 154,
  mirrorBottomY: 560,
  objectBaseY: 510,
  tableY: 542,
  candleWidth: 30,
  screenHeight: 188,
  rayViewerX: 1002,
};

export function PlaneMirrorLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: PlaneMirrorLabProps) {
  const { isZh, tt } = useLocale();
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  const [activeStep, setActiveStep] = useState<MirrorStepKey>("locate-image");
  const [objectDistanceCm, setObjectDistanceCm] = useState(STEP_PRESETS["locate-image"].objectDistance);
  const [objectHeightCm, setObjectHeightCm] = useState(STEP_PRESETS["locate-image"].objectHeight);
  const [comparisonOffsetCm, setComparisonOffsetCm] = useState(STEP_PRESETS["locate-image"].comparisonOffset);
  const [screenOffsetCm, setScreenOffsetCm] = useState(STEP_PRESETS["locate-image"].screenOffset);
  const [showRays, setShowRays] = useState(STEP_PRESETS["locate-image"].showRays);
  const [showSymmetryLine, setShowSymmetryLine] = useState(STEP_PRESETS["locate-image"].showSymmetry);
  const [showComparisonCandle, setShowComparisonCandle] = useState(STEP_PRESETS["locate-image"].showComparisonCandle);
  const [showScreen, setShowScreen] = useState(STEP_PRESETS["locate-image"].showScreen);
  const [observationState, setObservationState] = useState<ObservationState>("idle");
  const [progress, setProgress] = useState(0);
  const [records, setRecords] = useState<Partial<Record<MirrorStepKey, MirrorRecord>>>({});
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const timerRef = useRef<TimerId | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

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
  const imageDistanceCm = objectDistanceCm;
  const imageHeightCm = objectHeightCm;
  const isComparisonAligned = showComparisonCandle && Math.abs(comparisonOffsetCm) <= 0.5;
  const isScreenAligned = showScreen && Math.abs(screenOffsetCm) <= 0.5;
  const isStepSatisfied = activeStep === "locate-image"
    ? isComparisonAligned
    : activeStep === "virtual-image"
      ? isScreenAligned
      : activeStep === "symmetry"
        ? showSymmetryLine
        : true;
  const currentStepRecorded = Boolean(records[activeStep]);
  const recordedCount = STEP_SEQUENCE.filter((key) => records[key]).length;
  const isRecordEnabled = observationState === "stable" && isStepSatisfied;

  const scene = useMemo(
    () =>
      buildMirrorScene({
        objectDistanceCm,
        objectHeightCm,
        comparisonOffsetCm,
        screenOffsetCm,
      }),
    [comparisonOffsetCm, objectDistanceCm, objectHeightCm, screenOffsetCm],
  );

  useEffect(() => {
    if (!dragTarget) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const svg = svgRef.current;
      if (!svg) {
        return;
      }

      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }

      const svgX = ((event.clientX - rect.left) / rect.width) * SVG_STAGE.width;

      if (dragTarget === "object") {
        const nextDistance = clampAndSnapRangeValue(
          (SVG_STAGE.mirrorX - svgX) / DISTANCE_SCALE_PX,
          OBJECT_DISTANCE_MIN,
          OBJECT_DISTANCE_MAX,
          0.5,
        );

        if (nextDistance !== objectDistanceCm) {
          setObjectDistanceCm(nextDistance);
          invalidateObservation();
        }

        return;
      }

      if (dragTarget === "comparison") {
        const nextOffset = clampAndSnapRangeValue(
          (svgX - scene.imageX) / DISTANCE_SCALE_PX,
          -OFFSET_LIMIT_CM,
          OFFSET_LIMIT_CM,
          0.5,
        );

        if (nextOffset !== comparisonOffsetCm) {
          setComparisonOffsetCm(nextOffset);
          invalidateObservation();
        }

        return;
      }

      const nextOffset = clampAndSnapRangeValue(
        (svgX - scene.imageX) / DISTANCE_SCALE_PX,
        -OFFSET_LIMIT_CM,
        OFFSET_LIMIT_CM,
        0.5,
      );

      if (nextOffset !== screenOffsetCm) {
        setScreenOffsetCm(nextOffset);
        invalidateObservation();
      }
    }

    function handlePointerUp() {
      setDragTarget(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    comparisonOffsetCm,
    dragTarget,
    objectDistanceCm,
    scene.imageX,
    screenOffsetCm,
  ]);

  const stageMeta = useMemo(() => {
    const copy = describeStepObservation({
      step: activeStep,
      objectDistanceCm,
      objectHeightCm,
      comparisonOffsetCm,
      screenOffsetCm,
      isComparisonAligned,
      isScreenAligned,
      showComparisonCandle,
      showScreen,
      showSymmetryLine,
      isZh,
    });

    if (observationState === "observing") {
      return {
        label: isZh ? "观察中" : "Observing",
        tone: "active" as const,
        copy,
      };
    }

    if (observationState === "stable" && isStepSatisfied) {
      return {
        label: isZh ? "现象稳定" : "Ready to record",
        tone: "balanced" as const,
        copy,
      };
    }

    if (observationState === "stable") {
      return {
        label: isZh ? "待调整" : "Needs adjustment",
        tone: "warning" as const,
        copy,
      };
    }

    return {
      label: isZh ? "待观察" : "Ready",
      tone: "warning" as const,
      copy: activePreset.summary,
    };
  }, [
    activePreset.summary,
    activeStep,
    comparisonOffsetCm,
    isComparisonAligned,
    isScreenAligned,
    isStepSatisfied,
    isZh,
    objectDistanceCm,
    objectHeightCm,
    observationState,
    screenOffsetCm,
    showComparisonCandle,
    showScreen,
    showSymmetryLine,
  ]);

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
      key: "plane-mirror",
      title: isZh ? "四组课堂验证" : "Four classroom checks",
      countLabel: isZh ? `${recordedCount} / 4 组` : `${recordedCount} / 4 runs`,
      isActive: true,
      helper: isZh
        ? "按“找像定位 -> 等距等大 -> 虚像验证 -> 对称关系”依次验证，最后统一归纳平面镜成像规律。"
        : "Verify locating, equal distance, virtual image, and symmetry in order.",
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
            ? "课堂结论：平面镜所成的像始终正立、等大、等距、虚像，并且物像关于镜面对称。"
            : "Conclusion: a plane mirror always forms an upright, same-size, equally distant virtual image symmetric to the mirror.")
          : undefined,
    },
  ];

  const summaryItems: MirrorSummaryItem[] = useMemo(
    () => [
      {
        label: isZh ? "当前结论" : "Current takeaway",
        value: tt(activePreset.focus),
      },
      {
        label: isZh ? "像的性质" : "Image property",
        value: isZh ? "正立 · 等大 · 虚像" : "Upright · same size · virtual",
      },
    ],
    [activePreset.focus, isZh, tt],
  );

  const primaryActionLabel = observationState === "observing"
    ? (isZh ? "观察中…" : "Observing…")
    : observationState === "stable"
      ? (isZh ? "重新观察" : "Replay")
      : (isZh ? "开始观察" : "Start");
  const recordButtonLabel = currentStepRecorded
    ? (isZh ? "更新本组" : "Update current run")
    : (isZh ? "记录本组" : "Record current run");
  const imagePropertyChip = activeStep === "virtual-image"
    ? (isScreenAligned ? (isZh ? "屏上无像" : "No image on screen") : (isZh ? "拖光屏验证" : "Move the screen"))
    : activeStep === "locate-image"
      ? (isComparisonAligned ? (isZh ? "已找到像点" : "Image located") : (isZh ? "继续找像" : "Align candle B"))
      : (isZh ? "像距 = 物距" : "v = u");

  return (
    <section ref={fullscreenRef} className="visual-shell force-lab-shell plane-mirror-lab-shell">
      <div
        className={
          isControlPanelCollapsed
            ? "force-lab-layout mirror-lab-layout is-collapsed"
            : "force-lab-layout mirror-lab-layout"
        }
      >
        <aside
          className={
            isControlPanelCollapsed
              ? "force-control-panel mirror-control-panel is-collapsed"
              : "force-control-panel mirror-control-panel"
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

              <div className="force-control-scroll mirror-control-scroll">
                <ControlPanelSection
                  title={isZh ? "课堂主流程" : "Classroom Flow"}
                  hint={isZh ? "先找像，再验证等距、虚像和对称" : "Locate first, then verify distance, virtual image, and symmetry"}
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
                  hint={isZh ? "拖动物距和物高，像距与像高会同步变化" : "Move distance and height to see the image follow instantly"}
                >
                  <ControlRange
                    id="plane-mirror-object-distance"
                    label={isZh ? "物距 u" : "Object distance u"}
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
                    id="plane-mirror-object-height"
                    label={isZh ? "物高 h" : "Object height h"}
                    min={OBJECT_HEIGHT_MIN}
                    max={OBJECT_HEIGHT_MAX}
                    step={0.5}
                    unit="cm"
                    value={objectHeightCm}
                    editable
                    onChange={(value) => {
                      setObjectHeightCm(value);
                      invalidateObservation();
                    }}
                  />

                  <div className="pressure-inline-lock-grid">
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "像距 v" : "Image distance v"}</span>
                      <strong className="force-insight-value">{formatMeasure(imageDistanceCm)} cm</strong>
                    </article>
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "像高 h′" : "Image height h′"}</span>
                      <strong className="force-insight-value">{formatMeasure(imageHeightCm)} cm</strong>
                    </article>
                  </div>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "验证器材" : "Verification Tools"}
                  hint={isZh ? "按当前步骤切换蜡烛 B、光屏、光路和对称线" : "Use candle B, screen, rays, and symmetry line as needed"}
                >
                  <ControlChipGroup
                    items={[
                      {
                        key: "show-comparison-candle",
                        label: tt("蜡烛 B"),
                        active: showComparisonCandle,
                        onClick: () => {
                          setShowComparisonCandle((previous) => !previous);
                          invalidateObservation();
                        },
                      },
                      {
                        key: "show-screen",
                        label: tt("光屏"),
                        active: showScreen,
                        onClick: () => {
                          setShowScreen((previous) => !previous);
                          invalidateObservation();
                        },
                      },
                      {
                        key: "show-rays",
                        label: tt("光路"),
                        active: showRays,
                        onClick: () => setShowRays((previous) => !previous),
                      },
                      {
                        key: "show-symmetry",
                        label: tt("对称线"),
                        active: showSymmetryLine,
                        onClick: () => {
                          setShowSymmetryLine((previous) => !previous);
                          invalidateObservation();
                        },
                      },
                    ]}
                    columns={2}
                    size="dense"
                  />

                  <ControlRange
                    id="plane-mirror-comparison-offset"
                    label={isZh ? "蜡烛 B 偏移" : "Candle B offset"}
                    min={-OFFSET_LIMIT_CM}
                    max={OFFSET_LIMIT_CM}
                    step={0.5}
                    unit="cm"
                    value={comparisonOffsetCm}
                    editable
                    disabled={!showComparisonCandle}
                    valueFormatter={(value) => formatSignedMeasure(value, "cm")}
                    onChange={(value) => {
                      setComparisonOffsetCm(value);
                      invalidateObservation();
                    }}
                  />

                  <ControlRange
                    id="plane-mirror-screen-offset"
                    label={isZh ? "光屏偏移" : "Screen offset"}
                    min={-OFFSET_LIMIT_CM}
                    max={OFFSET_LIMIT_CM}
                    step={0.5}
                    unit="cm"
                    value={screenOffsetCm}
                    editable
                    disabled={!showScreen}
                    valueFormatter={(value) => formatSignedMeasure(value, "cm")}
                    onChange={(value) => {
                      setScreenOffsetCm(value);
                      invalidateObservation();
                    }}
                  />
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "操作与记录" : "Observe & Record"}
                  hint={isZh ? "观察稳定且步骤条件满足后，再记录本组" : "Record only after the geometry settles and the step condition is met"}
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
                    emptyTitle={isZh ? "先完成第一组验证" : "Finish the first validation"}
                    emptyCopy={
                      isZh
                        ? "记录单会保留找像、等距、虚像和对称四组结论，最后统一归纳平面镜成像规律。"
                        : "The worksheet keeps the locating, equal-distance, virtual-image, and symmetry observations."
                    }
                    pendingCopy={isZh ? "待测" : "Pending"}
                  />
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "思考提示" : "Think Prompt"}
                  hint={isZh ? "帮助课堂讲解虚像和对称关系" : "Support the class explanation of virtual images"}
                >
                  <ul className="force-support-question-list">
                    <li>{isZh ? "为什么实验中要用玻璃板，而不是直接用普通平面镜？" : "Why use a glass plate instead of an ordinary plane mirror?"}</li>
                    <li>{isZh ? "人走近平面镜时，镜中的像真的会变大吗？" : "Does the image really get larger when a person walks toward a mirror?"}</li>
                    <li>{isZh ? "为什么把光屏放到像的位置，屏上仍旧没有像？" : "Why does the screen still receive no image at the image location?"}</li>
                  </ul>
                </ControlPanelSection>
              </div>
            </>
          )}
        </aside>

        <div className="force-lab-main mirror-lab-main">
          <div className="force-toolbar">
            <div className="force-toolbar-status">
              <StatusPill tone="active">{tt("平面镜成像")}</StatusPill>
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

          <div className="visual-canvas force-stage-canvas mirror-stage-canvas is-2d-mode">
            <ControlStepGroup
              className="force-stage-overlay is-top-center force-stage-stepbar mirror-stage-stepbar"
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
                  <span className="force-stage-chip">{tt("虚像")}</span>
                  <span className="force-stage-chip">{tt(imagePropertyChip)}</span>
                  <span className="force-stage-chip">{tt(showRays ? "光路显示中" : "几何关系")}</span>
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
                    <span>{isZh ? "物距 u" : "Object distance u"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{formatMeasure(imageDistanceCm)} cm</strong>
                    <span>{isZh ? "像距 v" : "Image distance v"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{formatMeasure(objectHeightCm)} cm</strong>
                    <span>{isZh ? "物高 h" : "Object height h"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{formatMeasure(imageHeightCm)} cm</strong>
                    <span>{isZh ? "像高 h′" : "Image height h′"}</span>
                  </article>
                </div>
                <p className="pressure-stage-formula">
                  {isZh
                    ? `v = u = ${formatMeasure(objectDistanceCm)} cm · h′ = h = ${formatMeasure(objectHeightCm)} cm`
                    : `v = u = ${formatMeasure(objectDistanceCm)} cm · h′ = h = ${formatMeasure(objectHeightCm)} cm`}
                </p>
              </div>
            </div>

            <div className="force-stage-overlay is-bottom-right">
              <div className="force-stage-hud-card is-tight mirror-stage-summary-card">
                <div className="force-stage-hud-head">
                  <span className="force-stage-hud-title">{isZh ? "课堂摘要" : "Classroom Summary"}</span>
                  <span className="force-stage-chip">{isZh ? `${recordedCount} / 4` : `${recordedCount} / 4`}</span>
                </div>
                <div className="mirror-stage-summary-grid">
                  {summaryItems.map((item) => (
                    <article key={item.label} className="mirror-stage-summary-item">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_STAGE.width} ${SVG_STAGE.height}`}
              className="force-stage-svg mirror-stage-svg"
              role="img"
              aria-label={isZh ? `${tt(topic.title)}可视化示意图` : `${tt(topic.title)} visualization`}
              style={{ touchAction: "none" }}
            >
              <defs>
                <marker id="mirror-arrow-warm" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto">
                  <path d="M0,0 L12,6 L0,12 z" fill="#ffbf67" />
                </marker>
                <marker id="mirror-arrow-cool" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto">
                  <path d="M0,0 L12,6 L0,12 z" fill="#67c6ff" />
                </marker>
                <marker id="mirror-arrow-measure" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="8" markerHeight="8" orient="auto">
                  <path d="M12,6 L0,0 L0,12 z" fill="rgba(228, 238, 255, 0.88)" />
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
                {tt("平面镜成像舞台")}
              </text>
              <text x={SVG_STAGE.panelX + 34} y={SVG_STAGE.panelY + 54} className="motion-stage-panel-copy">
                {tt("拖动物体、蜡烛 B 或光屏，观察虚像如何始终与实物保持等距对称。")}
              </text>

              <line
                x1={SVG_STAGE.panelX + 38}
                y1={SVG_STAGE.tableY}
                x2={SVG_STAGE.panelX + SVG_STAGE.panelWidth - 40}
                y2={SVG_STAGE.tableY}
                className="mirror-stage-table-line"
              />

              <rect
                x={SVG_STAGE.mirrorX - 12}
                y={scene.mirrorTopY}
                width="24"
                height={scene.mirrorBottomY - scene.mirrorTopY}
                rx="12"
                className="mirror-stage-glass-body"
              />
              <line
                x1={SVG_STAGE.mirrorX}
                y1={scene.mirrorTopY + 10}
                x2={SVG_STAGE.mirrorX}
                y2={scene.mirrorBottomY - 10}
                className="mirror-stage-glass-axis"
              />
              <text x={SVG_STAGE.mirrorX} y={scene.mirrorTopY - 16} textAnchor="middle" className="motion-stage-ruler-label">
                {tt("玻璃板 / 镜面")}
              </text>

              {showSymmetryLine ? (
                <>
                  <line
                    x1={scene.objectX}
                    y1={scene.helperLineY}
                    x2={scene.imageX}
                    y2={scene.helperLineY}
                    className="mirror-stage-symmetry-line"
                  />
                  <path
                    d={`M ${SVG_STAGE.mirrorX - 18} ${scene.helperLineY}
                      L ${SVG_STAGE.mirrorX - 18} ${scene.helperLineY - 22}
                      L ${SVG_STAGE.mirrorX} ${scene.helperLineY - 22}`}
                    className="mirror-stage-perpendicular-mark"
                  />
                  <text x={SVG_STAGE.mirrorX} y={scene.helperLineY + 26} textAnchor="middle" className="mirror-stage-helper-text">
                    {tt("物像连线垂直镜面")}
                  </text>
                </>
              ) : null}

              <line
                x1={scene.objectX}
                y1={scene.helperLineY - 54}
                x2={SVG_STAGE.mirrorX}
                y2={scene.helperLineY - 54}
                className="mirror-stage-distance-line"
                markerStart="url(#mirror-arrow-measure)"
                markerEnd="url(#mirror-arrow-measure)"
              />
              <text
                x={(scene.objectX + SVG_STAGE.mirrorX) / 2}
                y={scene.helperLineY - 64}
                textAnchor="middle"
                className="mirror-stage-distance-text"
              >
                {`u = ${formatMeasure(objectDistanceCm)} cm`}
              </text>

              <line
                x1={SVG_STAGE.mirrorX}
                y1={scene.helperLineY - 24}
                x2={scene.imageX}
                y2={scene.helperLineY - 24}
                className="mirror-stage-distance-line"
                markerStart="url(#mirror-arrow-measure)"
                markerEnd="url(#mirror-arrow-measure)"
              />
              <text
                x={(SVG_STAGE.mirrorX + scene.imageX) / 2}
                y={scene.helperLineY - 34}
                textAnchor="middle"
                className="mirror-stage-distance-text"
              >
                {`v = ${formatMeasure(imageDistanceCm)} cm`}
              </text>

              {showRays
                ? scene.incidentRays.map((ray, index) => (
                  <g key={`ray-${index}`}>
                    <path
                      d={ray.incidentPath}
                      className="mirror-stage-ray is-incident"
                      markerEnd="url(#mirror-arrow-warm)"
                    />
                    <path
                      d={ray.reflectedPath}
                      className="mirror-stage-ray is-reflected"
                      markerEnd="url(#mirror-arrow-cool)"
                    />
                    <path
                      d={ray.extensionPath}
                      className="mirror-stage-ray is-extension"
                    />
                  </g>
                ))
                : null}

              <CandleFigure
                x={scene.objectX}
                baseY={SVG_STAGE.objectBaseY}
                height={objectHeightCm * HEIGHT_SCALE_PX}
                label={tt("蜡烛 A")}
                caption={tt("实物")}
                variant="object"
                onPointerDown={handleDragStart("object")}
              />

              <CandleFigure
                x={scene.imageX}
                baseY={SVG_STAGE.objectBaseY}
                height={imageHeightCm * HEIGHT_SCALE_PX}
                label={tt("像 A′")}
                caption={tt("虚像")}
                variant="image"
              />

              {showComparisonCandle ? (
                <CandleFigure
                  x={scene.comparisonX}
                  baseY={SVG_STAGE.objectBaseY}
                  height={imageHeightCm * HEIGHT_SCALE_PX}
                  label={tt("蜡烛 B")}
                  caption={isComparisonAligned ? tt("已重合") : tt("拖动重合")}
                  variant="comparison"
                  aligned={isComparisonAligned}
                  onPointerDown={handleDragStart("comparison")}
                />
              ) : null}

              {showScreen ? (
                <ScreenFigure
                  x={scene.screenX}
                  baseY={SVG_STAGE.objectBaseY + 4}
                  height={SVG_STAGE.screenHeight}
                  aligned={isScreenAligned}
                  onPointerDown={handleDragStart("screen")}
                  label={tt("光屏")}
                  note={isScreenAligned ? tt("屏上无像") : tt("拖到像点")}
                />
              ) : null}

              <text
                x={scene.imageX}
                y={scene.imageTopY - 18}
                textAnchor="middle"
                className="mirror-stage-image-label"
              >
                {tt("像与物始终等大")}
              </text>

              {showRays ? (
                <text
                  x={SVG_STAGE.mirrorX + 132}
                  y={scene.imageTopY - 10}
                  className="mirror-stage-extension-note"
                >
                  {tt("反向延长线交于像点")}
                </text>
              ) : null}

              <text x={SVG_STAGE.panelX + 34} y={SVG_STAGE.panelY + 470} className="motion-stage-panel-title">
                {tt("当前判断")}
              </text>
              <text x={SVG_STAGE.panelX + 34} y={SVG_STAGE.panelY + 500} className="pressure-stage-label">
                {tt(stageMeta.copy)}
              </text>
              <text x={SVG_STAGE.panelX + 34} y={SVG_STAGE.panelY + 532} className="pressure-stage-value">
                {isZh
                  ? `v = u = ${formatMeasure(objectDistanceCm)} cm，h′ = h = ${formatMeasure(objectHeightCm)} cm`
                  : `v = u = ${formatMeasure(objectDistanceCm)} cm, h′ = h = ${formatMeasure(objectHeightCm)} cm`}
              </text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );

  function invalidateObservation() {
    clearObservationTimer(timerRef.current);
    timerRef.current = null;
    setObservationState("idle");
    setProgress(0);
  }

  function applyPreset(step: MirrorStepKey) {
    const preset = STEP_PRESETS[step];
    setActiveStep(step);
    setObjectDistanceCm(preset.objectDistance);
    setObjectHeightCm(preset.objectHeight);
    setComparisonOffsetCm(preset.comparisonOffset);
    setScreenOffsetCm(preset.screenOffset);
    setShowRays(preset.showRays);
    setShowSymmetryLine(preset.showSymmetry);
    setShowComparisonCandle(preset.showComparisonCandle);
    setShowScreen(preset.showScreen);
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
          objectDistanceCm,
          objectHeightCm,
          isZh,
        }),
        note: buildRecordNote({
          step: activeStep,
          objectDistanceCm,
          objectHeightCm,
          isComparisonAligned,
          isScreenAligned,
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
    setActiveStep("locate-image");
    setObjectDistanceCm(STEP_PRESETS["locate-image"].objectDistance);
    setObjectHeightCm(STEP_PRESETS["locate-image"].objectHeight);
    setComparisonOffsetCm(STEP_PRESETS["locate-image"].comparisonOffset);
    setScreenOffsetCm(STEP_PRESETS["locate-image"].screenOffset);
    setShowRays(STEP_PRESETS["locate-image"].showRays);
    setShowSymmetryLine(STEP_PRESETS["locate-image"].showSymmetry);
    setShowComparisonCandle(STEP_PRESETS["locate-image"].showComparisonCandle);
    setShowScreen(STEP_PRESETS["locate-image"].showScreen);
    setObservationState("idle");
    setProgress(0);
    setRecords({});
    setDragTarget(null);
  }

  function handleDragStart(target: DragTarget) {
    return (event: ReactPointerEvent<SVGGElement>) => {
      event.preventDefault();
      setDragTarget(target);
    };
  }
}

function buildMirrorScene({
  objectDistanceCm,
  objectHeightCm,
  comparisonOffsetCm,
  screenOffsetCm,
}: {
  objectDistanceCm: number;
  objectHeightCm: number;
  comparisonOffsetCm: number;
  screenOffsetCm: number;
}): MirrorScene {
  const objectX = SVG_STAGE.mirrorX - objectDistanceCm * DISTANCE_SCALE_PX;
  const imageX = SVG_STAGE.mirrorX + objectDistanceCm * DISTANCE_SCALE_PX;
  const comparisonX = imageX + comparisonOffsetCm * DISTANCE_SCALE_PX;
  const screenX = imageX + screenOffsetCm * DISTANCE_SCALE_PX;
  const objectTopY = SVG_STAGE.objectBaseY - objectHeightCm * HEIGHT_SCALE_PX;
  const imageTopY = objectTopY;
  const helperLineY = SVG_STAGE.objectBaseY + 18;
  const mirrorTopY = SVG_STAGE.mirrorTopY;
  const mirrorBottomY = SVG_STAGE.mirrorBottomY;
  const mirrorPoints = [objectTopY + 38, objectTopY + 116];

  const incidentRays = mirrorPoints.map((mirrorPointY) => {
    const incidentPath = `M ${objectX} ${objectTopY} L ${SVG_STAGE.mirrorX} ${mirrorPointY}`;
    const extensionPath = `M ${SVG_STAGE.mirrorX} ${mirrorPointY} L ${imageX} ${imageTopY}`;
    const slope =
      imageX === SVG_STAGE.mirrorX
        ? 0
        : (mirrorPointY - imageTopY) / (SVG_STAGE.mirrorX - imageX);
    const reflectedEndY =
      mirrorPointY + slope * (SVG_STAGE.rayViewerX - SVG_STAGE.mirrorX);
    const reflectedPath = `M ${SVG_STAGE.mirrorX} ${mirrorPointY} L ${SVG_STAGE.rayViewerX} ${reflectedEndY}`;

    return {
      incidentPath,
      reflectedPath,
      extensionPath,
    };
  });

  return {
    objectX,
    imageX,
    comparisonX,
    screenX,
    objectTopY,
    imageTopY,
    mirrorTopY,
    mirrorBottomY,
    helperLineY,
    incidentRays,
  };
}

function describeStepObservation({
  step,
  objectDistanceCm,
  objectHeightCm,
  comparisonOffsetCm,
  screenOffsetCm,
  isComparisonAligned,
  isScreenAligned,
  showComparisonCandle,
  showScreen,
  showSymmetryLine,
  isZh,
}: {
  step: MirrorStepKey;
  objectDistanceCm: number;
  objectHeightCm: number;
  comparisonOffsetCm: number;
  screenOffsetCm: number;
  isComparisonAligned: boolean;
  isScreenAligned: boolean;
  showComparisonCandle: boolean;
  showScreen: boolean;
  showSymmetryLine: boolean;
  isZh: boolean;
}) {
  if (step === "locate-image") {
    if (!showComparisonCandle) {
      return isZh
        ? "先显示蜡烛 B，再用重合法确定平面镜后的像点。"
        : "Show candle B first, then use the overlap method to locate the image.";
    }

    if (isComparisonAligned) {
      return isZh
        ? `蜡烛 B 已与像完全重合，说明像点在镜后 ${formatMeasure(objectDistanceCm)} cm 处。`
        : `Candle B overlaps the image, locating it ${formatMeasure(objectDistanceCm)} cm behind the mirror.`;
    }

    return isZh
      ? `继续移动蜡烛 B，当前还差 ${formatMeasure(Math.abs(comparisonOffsetCm))} cm 才能完全重合。`
      : `Move candle B by another ${formatMeasure(Math.abs(comparisonOffsetCm))} cm to overlap fully.`;
  }

  if (step === "equal-distance") {
    return isZh
      ? `当前物距 ${formatMeasure(objectDistanceCm)} cm、物高 ${formatMeasure(objectHeightCm)} cm，对应像距和像高都保持完全相等。`
      : `At u=${formatMeasure(objectDistanceCm)} cm and h=${formatMeasure(objectHeightCm)} cm, the image distance and height stay equal.`;
  }

  if (step === "virtual-image") {
    if (!showScreen) {
      return isZh
        ? "先显示光屏，再把它移到像的位置验证平面镜成的是虚像。"
        : "Show the screen first, then move it to the image position.";
    }

    if (isScreenAligned) {
      return isZh
        ? "光屏已经移到像的位置，但屏上仍旧没有像，说明这是虚像。"
        : "The screen reaches the image position yet still shows no image, proving a virtual image.";
    }

    return isZh
      ? `把光屏再向${screenOffsetCm > 0 ? "右" : "左"}移动 ${formatMeasure(Math.abs(screenOffsetCm))} cm 到像的位置。`
      : `Move the screen ${formatMeasure(Math.abs(screenOffsetCm))} cm ${screenOffsetCm > 0 ? "right" : "left"} to the image position.`;
  }

  return showSymmetryLine
    ? (isZh
      ? "物点和像点的连线始终垂直镜面，说明物像关于镜面对称。"
      : "The line connecting object and image stays perpendicular to the mirror.")
    : (isZh
      ? "先显示对称线，再观察物像连线与镜面的垂直关系。"
      : "Show the symmetry line first to inspect the perpendicular relation.");
}

function buildRecordValue({
  step,
  objectDistanceCm,
  objectHeightCm,
  isZh,
}: {
  step: MirrorStepKey;
  objectDistanceCm: number;
  objectHeightCm: number;
  isZh: boolean;
}) {
  if (step === "locate-image") {
    return isZh
      ? `像点在镜后 ${formatMeasure(objectDistanceCm)} cm`
      : `Image at ${formatMeasure(objectDistanceCm)} cm behind mirror`;
  }

  if (step === "equal-distance") {
    return `u = v = ${formatMeasure(objectDistanceCm)} cm · h′ = h = ${formatMeasure(objectHeightCm)} cm`;
  }

  if (step === "virtual-image") {
    return isZh ? "光屏上无像" : "No image on screen";
  }

  return isZh ? "物像关于镜面对称" : "Object and image are mirror-symmetric";
}

function buildRecordNote({
  step,
  objectDistanceCm,
  objectHeightCm,
  isComparisonAligned,
  isScreenAligned,
  isZh,
}: {
  step: MirrorStepKey;
  objectDistanceCm: number;
  objectHeightCm: number;
  isComparisonAligned: boolean;
  isScreenAligned: boolean;
  isZh: boolean;
}) {
  if (step === "locate-image") {
    return isComparisonAligned
      ? (isZh
        ? `蜡烛 B 与像完全重合，可据此确定像点与镜面的距离。`
        : "Candle B overlaps the image, locating the image point.")
      : (isZh
        ? "蜡烛 B 还没有完全对准像点。"
        : "Candle B is not fully aligned with the image yet.");
  }

  if (step === "equal-distance") {
    return isZh
      ? `当物距为 ${formatMeasure(objectDistanceCm)} cm、物高为 ${formatMeasure(objectHeightCm)} cm 时，像距和像高都同步相等。`
      : `At u=${formatMeasure(objectDistanceCm)} cm and h=${formatMeasure(objectHeightCm)} cm, the image remains equally distant and equally high.`;
  }

  if (step === "virtual-image") {
    return isScreenAligned
      ? (isZh
        ? "光屏放在像的位置仍接不到像，说明像不是实际光线会聚形成的。"
        : "The screen still receives no image at the image position.")
      : (isZh
        ? "光屏还没有移动到像的位置。"
        : "The screen has not reached the image position yet.");
  }

  return isZh
    ? "物点与像点的连线垂直镜面，镜面相当于对称轴。"
    : "The segment connecting object and image stays perpendicular to the mirror.";
}

function CandleFigure({
  x,
  baseY,
  height,
  label,
  caption,
  variant,
  aligned = false,
  onPointerDown,
}: {
  x: number;
  baseY: number;
  height: number;
  label: string;
  caption: string;
  variant: "object" | "image" | "comparison";
  aligned?: boolean;
  onPointerDown?: (event: ReactPointerEvent<SVGGElement>) => void;
}) {
  const halfWidth = SVG_STAGE.candleWidth / 2;
  const topY = baseY - height;
  const className = [
    "mirror-stage-candle",
    `is-${variant}`,
    aligned ? "is-aligned" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <g
      className={className}
      onPointerDown={onPointerDown}
      style={onPointerDown ? { cursor: "grab" } : undefined}
    >
      <ellipse cx={x} cy={baseY + 6} rx={22} ry={7} className="mirror-stage-candle-shadow" />
      <rect
        x={x - halfWidth}
        y={topY}
        width={SVG_STAGE.candleWidth}
        height={height}
        rx="8"
        className="mirror-stage-candle-body"
      />
      <rect
        x={x - halfWidth + 4}
        y={topY + 8}
        width={6}
        height={Math.max(24, height - 16)}
        rx="3"
        className="mirror-stage-candle-highlight"
      />
      <ellipse cx={x} cy={baseY + 1} rx={18} ry={5} className="mirror-stage-candle-base" />
      {variant !== "comparison" ? (
        <>
          <path
            d={`M ${x} ${topY - 30} C ${x - 12} ${topY - 12}, ${x - 6} ${topY - 2}, ${x} ${topY + 3}
              C ${x + 6} ${topY - 2}, ${x + 12} ${topY - 12}, ${x} ${topY - 30} Z`}
            className="mirror-stage-candle-flame"
          />
          <path
            d={`M ${x} ${topY - 18} C ${x - 6} ${topY - 9}, ${x - 2} ${topY - 2}, ${x} ${topY + 2}
              C ${x + 2} ${topY - 2}, ${x + 6} ${topY - 9}, ${x} ${topY - 18} Z`}
            className="mirror-stage-candle-flame-core"
          />
        </>
      ) : null}
      <text x={x} y={baseY + 34} textAnchor="middle" className="mirror-stage-candle-label">
        {label}
      </text>
      <text x={x} y={baseY + 52} textAnchor="middle" className="mirror-stage-candle-caption">
        {caption}
      </text>
    </g>
  );
}

function ScreenFigure({
  x,
  baseY,
  height,
  aligned,
  onPointerDown,
  label,
  note,
}: {
  x: number;
  baseY: number;
  height: number;
  aligned: boolean;
  onPointerDown?: (event: ReactPointerEvent<SVGGElement>) => void;
  label: string;
  note: string;
}) {
  const topY = baseY - height;

  return (
    <g
      className={["mirror-stage-screen", aligned ? "is-aligned" : ""].filter(Boolean).join(" ")}
      onPointerDown={onPointerDown}
      style={onPointerDown ? { cursor: "grab" } : undefined}
    >
      <rect x={x - 20} y={topY} width={40} height={height} rx="8" className="mirror-stage-screen-frame" />
      <rect x={x - 15} y={topY + 8} width={30} height={height - 20} rx="6" className="mirror-stage-screen-surface" />
      <path
        d={`M ${x} ${baseY}
          L ${x - 10} ${baseY + 24}
          L ${x + 10} ${baseY + 24} Z`}
        className="mirror-stage-screen-stand"
      />
      <text x={x} y={topY - 12} textAnchor="middle" className="mirror-stage-screen-label">
        {label}
      </text>
      <text x={x} y={baseY + 44} textAnchor="middle" className="mirror-stage-screen-note">
        {note}
      </text>
    </g>
  );
}

function formatMeasure(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1).replace(/\.0$/, "");
}

function formatSignedMeasure(value: number, unit: string) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatMeasure(Math.abs(value))} ${unit}`;
}

function clampAndSnapRangeValue(value: number, min: number, max: number, step: number) {
  const boundedValue = Math.min(max, Math.max(min, value));
  if (step <= 0) {
    return boundedValue;
  }

  const normalizedValue = Math.round((boundedValue - min) / step) * step + min;
  return Number(normalizedValue.toFixed(1));
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
