import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { ControlButton } from "./control-button";
import { ControlOptionGroup } from "./control-option-group";
import { ControlPanelSection } from "./control-panel-section";
import { ControlRange } from "./control-range";
import { ControlStatusBar } from "./control-status-bar";
import { StatusPill } from "./status-pill";
import type { TeachingTopic } from "../data/teaching-catalog";

type ForceKey = "gravity" | "normal" | "pull" | "friction" | "net";
type MotionState = "rest" | "threshold" | "sliding";
type Tone = "balanced" | "warning" | "active";
type SurfacePresetKey = "smooth-board" | "wood-board" | "cloth" | "towel";
type ContactAreaKey = "flat" | "side" | "upright";
type ExperimentPhase = "idle" | "ramping" | "breakaway" | "uniform" | "complete";

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
  groundY: number;
  blockX: number;
  blockY: number;
  blockWidth: number;
  blockHeight: number;
  centerX: number;
  centerY: number;
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
  pressure: 4,
  surfacePreset: "wood-board" as SurfacePresetKey,
  contactArea: "flat" as ContactAreaKey,
};

const GRAVITY = 9.8;
const RAMP_DURATION_MS = 1500;
const BREAKAWAY_DURATION_MS = 900;
const UNIFORM_DURATION_MS = 1800;

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

const OBJECTIVES = [
  {
    title: "压力影响",
    detail: "压力越大，动摩擦力越大，公式里直接体现在 N 的变化上。",
  },
  {
    title: "材质影响",
    detail: "接触面越粗糙，摩擦系数越大，测力计稳定读数越高。",
  },
  {
    title: "面积无关",
    detail: "把木块正放、侧放、竖放，只改变形状，不进入公式。",
  },
];

export function BasicForceLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: BasicForceLabProps) {
  const [pressure, setPressure] = useState(DEFAULT_VALUES.pressure);
  const [surfacePreset, setSurfacePreset] = useState<SurfacePresetKey>(DEFAULT_VALUES.surfacePreset);
  const [contactArea, setContactArea] = useState<ContactAreaKey>(DEFAULT_VALUES.contactArea);
  const [activeForce, setActiveForce] = useState<ForceKey>("gravity");
  const [hasExperimentRun, setHasExperimentRun] = useState(false);
  const [isExperimentRunning, setIsExperimentRunning] = useState(false);
  const [experimentElapsedMs, setExperimentElapsedMs] = useState(0);
  const [currentRunId, setCurrentRunId] = useState(0);
  const [runRecords, setRunRecords] = useState<ExperimentRecord[]>([]);
  const hasMountedRef = useRef(false);
  const lastRecordedRunRef = useRef(0);

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
  }, [contactArea, pressure, surfacePreset]);

  const totalExperimentMs = RAMP_DURATION_MS + BREAKAWAY_DURATION_MS + UNIFORM_DURATION_MS;

  useEffect(() => {
    if (!isExperimentRunning) {
      return;
    }

    let animationFrameId = 0;
    const startTime = performance.now() - experimentElapsedMs;

    const tick = (timestamp: number) => {
      const nextElapsedMs = Math.min(timestamp - startTime, totalExperimentMs);
      setExperimentElapsedMs(nextElapsedMs);

      if (nextElapsedMs >= totalExperimentMs) {
        setIsExperimentRunning(false);
        return;
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [experimentElapsedMs, isExperimentRunning, totalExperimentMs]);

  const hasPlaybackStarted = hasExperimentRun || isExperimentRunning || experimentElapsedMs > 0;

  const displayedScene = useMemo(
    () =>
      computeExperimentScene({
        metrics,
        hasPlaybackStarted,
        experimentElapsedMs,
        totalExperimentMs,
      }),
    [experimentElapsedMs, hasPlaybackStarted, metrics, totalExperimentMs],
  );

  const stage = useMemo(
    () =>
      computeStageLayout({
        contactAreaMeta,
        travelProgress: displayedScene.travelProgress,
        pressure,
      }),
    [contactAreaMeta, displayedScene.travelProgress, pressure],
  );

  useEffect(() => {
    if (
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
    pressure,
    surfacePresetMeta.label,
    totalExperimentMs,
  ]);

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
        displayedScene.phase === "idle"
          ? "开始实验后，弹簧测力计会缓慢增大拉力，直到木块开始滑动。"
          : `当前测力计读数 ${formatNumber(displayedScene.pullForce, 1)} N。匀速阶段的稳定读数，就是本次测得的滑动摩擦力。`,
    },
    {
      key: "friction",
      label: "摩擦力 f",
      value: displayedScene.frictionForce,
      color: FORCE_COLORS.friction,
      description: `当前处于${displayedScene.frictionModeLabel}，摩擦力大小 ${formatNumber(displayedScene.frictionForce, 1)} N。真正记录实验数据时，使用的是匀速阶段的动摩擦 ${formatNumber(displayedScene.kineticFriction, 1)} N。`,
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
          : `突破静摩擦时出现瞬时合力 ${formatNumber(displayedScene.netForce, 2)} N，因此木块开始从静止转入滑动。`,
    },
  ];

  const currentForce = forceRows.find((item) => item.key === activeForce) ?? forceRows[0];
  const latestRecord = runRecords[0] ?? null;
  const comparisonRecord = runRecords[1] ?? null;
  const recentRecords = runRecords.slice(0, 2);

  const visibleForces = {
    gravity: true,
    normal: true,
    pull: hasPlaybackStarted,
    friction: hasPlaybackStarted,
    net: hasPlaybackStarted,
  };

  const experimentStatus = getExperimentStatus({
    hasPlaybackStarted,
    displayedScene,
    metrics,
  });
  const activePhase = hasPlaybackStarted ? displayedScene.phase : "idle";
  const hasPartialPlayback =
    experimentElapsedMs > 0 && experimentElapsedMs < totalExperimentMs;
  const phaseSteps = [
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
  ];
  const primaryActionLabel = isExperimentRunning
    ? "暂停实验"
    : hasPartialPlayback
      ? "继续播放"
      : hasPlaybackStarted
        ? "重新播放"
        : "开始实验";

  const horizontalMax = Math.max(
    metrics.breakawayForce,
    metrics.kineticFriction,
    Math.abs(displayedScene.netForce),
    1,
  );
  const verticalMax = Math.max(displayedScene.weight, displayedScene.normal, 1);

  function resetDefaults() {
    setPressure(DEFAULT_VALUES.pressure);
    setSurfacePreset(DEFAULT_VALUES.surfacePreset);
    setContactArea(DEFAULT_VALUES.contactArea);
    setActiveForce("gravity");
    setHasExperimentRun(false);
    setIsExperimentRunning(false);
    setExperimentElapsedMs(0);
  }

  function startExperiment() {
    setHasExperimentRun(true);
    setIsExperimentRunning(true);
    setExperimentElapsedMs(0);
    setCurrentRunId((previous) => previous + 1);
    setActiveForce("pull");
  }

  function stopExperiment() {
    setIsExperimentRunning(false);
    setHasExperimentRun(false);
    setExperimentElapsedMs(0);
    setActiveForce("gravity");
  }

  function pauseExperiment() {
    setIsExperimentRunning(false);
  }

  function resumeExperiment() {
    if (experimentElapsedMs <= 0 || experimentElapsedMs >= totalExperimentMs) {
      startExperiment();
      return;
    }

    setHasExperimentRun(true);
    setIsExperimentRunning(true);

    if (currentRunId === 0 || lastRecordedRunRef.current === currentRunId) {
      setCurrentRunId((previous) => previous + 1);
    }

    setActiveForce(getSuggestedForceForElapsedMs(experimentElapsedMs, totalExperimentMs));
  }

  function seekExperiment(nextElapsedMs: number) {
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
    setActiveForce(getSuggestedForceForElapsedMs(clampedElapsedMs, totalExperimentMs));
  }

  function jumpToPhase(phase: ExperimentPhase) {
    const targetStep = phaseSteps.find((item) => item.phase === phase);
    if (!targetStep) {
      return;
    }

    seekExperiment(targetStep.elapsedMs);
    setActiveForce(targetStep.forceKey);
  }

  function clearRecords() {
    setRunRecords([]);
  }

  return (
    <section ref={fullscreenRef} className="visual-shell force-lab-shell">
      <div className="force-lab-layout">
        <aside className="force-control-panel">
          <div className="force-control-header">
            <div className="force-control-title-block">
              <h4 className="force-control-title">控制面板</h4>
              <p className="force-control-copy">先改变量，再播放实验。</p>
            </div>
          </div>

          <div className="force-control-scroll">
            <ControlPanelSection title="实验控制" hint="先预测，再播放，再对比" accent>
              <ControlStatusBar
                items={[
                  <StatusPill key="state" tone={displayedScene.stateTone}>
                    {displayedScene.stateLabel}
                  </StatusPill>,
                  <StatusPill key="mode">{displayedScene.frictionModeLabel}</StatusPill>,
                  <StatusPill key="limit">
                    f静,max {formatNumber(metrics.staticLimit, 1)} N
                  </StatusPill>,
                ]}
              />

              <div className="force-action-grid">
                <ControlButton
                  variant="primary"
                  onClick={() => {
                    if (isExperimentRunning) {
                      pauseExperiment();
                      return;
                    }

                    if (hasPartialPlayback) {
                      resumeExperiment();
                      return;
                    }

                    startExperiment();
                  }}
                >
                  {primaryActionLabel}
                </ControlButton>
                <ControlButton onClick={startExperiment}>
                  从头播放
                </ControlButton>
                <ControlButton onClick={resetDefaults}>
                  恢复默认
                </ControlButton>
              </div>

              <div className="force-walkthrough-steps is-panel">
                {phaseSteps.map((step, index) => (
                  <button
                    key={step.phase}
                    type="button"
                    className={activePhase === step.phase ? "force-step-chip is-active" : "force-step-chip"}
                    onClick={() => jumpToPhase(step.phase)}
                  >
                    <span className="force-step-chip-index">{index + 1}</span>
                    <span>{step.label}</span>
                  </button>
                ))}
              </div>

              <ControlRange
                id="force-experiment-progress"
                label="实验时间轴"
                min={0}
                max={totalExperimentMs}
                step={10}
                value={hasPlaybackStarted ? experimentElapsedMs : 0}
                valueFormatter={() => `${Math.round((experimentStatus.progress || 0) * 100)}%`}
                onChange={seekExperiment}
              />
            </ControlPanelSection>

            <ControlPanelSection title="研究目标" hint="只观察三个教学变量">
              <div className="force-highlight-row is-panel">
                {OBJECTIVES.map((item) => (
                  <span key={item.title} className="force-highlight-chip">
                    {item.title}
                  </span>
                ))}
              </div>

              <p className="force-inline-copy">{displayedScene.summary}</p>
              <p className="force-inline-copy">{displayedScene.motionHint}</p>
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
              <ControlOptionGroup
                items={SURFACE_PRESETS.map((preset) => ({
                  key: preset.key,
                  label: preset.label,
                  description: preset.description,
                  active: surfacePreset === preset.key,
                  onClick: () => setSurfacePreset(preset.key),
                }))}
                columns={2}
              />
            </ControlPanelSection>

            <ControlPanelSection title="摆放方式" hint="验证面积是否进入公式">
              <ControlOptionGroup
                items={CONTACT_AREAS.map((item) => ({
                  key: item.key,
                  label: item.label,
                  description: item.description,
                  active: contactArea === item.key,
                  preview: (
                    <span className={`control-option-preview is-${item.key}`}>
                      <span />
                    </span>
                  ),
                  onClick: () => setContactArea(item.key),
                }))}
                columns={3}
              />
            </ControlPanelSection>

            <ControlPanelSection title="当前结论" hint="对比两组结果最有价值">
              <p className="force-inline-copy">{currentForce.description}</p>
              <p className="force-inline-copy">{experimentStatus.formula}</p>

              <div className="force-stage-records">
                <div className="force-stage-records-head">
                  <p className="surface-eyebrow">最近对比</p>
                  {runRecords.length > 1 ? (
                    <button type="button" className="force-text-button" onClick={clearRecords}>
                      清空记录
                    </button>
                  ) : null}
                </div>

                <p className="force-stage-empty">
                  {comparisonRecord
                    ? `与上一组相比，稳定读数变化 ${formatSignedNumber(latestRecord!.kineticFriction - comparisonRecord.kineticFriction)} N。`
                    : "先完成一组实验，再切换材质、压力或摆放方式做第二组对比。"}
                </p>

                {recentRecords.length > 0 ? (
                  <div className="force-stage-record-list is-sidebar">
                    {recentRecords.map((record, index) => (
                      <article key={record.id} className="force-stage-record-card">
                        <div className="force-stage-record-head">
                          <strong>{index === 0 ? "当前结果" : "上一组结果"}</strong>
                          <StatusPill>{formatNumber(record.kineticFriction, 1)} N</StatusPill>
                        </div>
                        <div className="force-stage-record-meta">
                          <span>{record.surfaceLabel}</span>
                          <span>压力 {formatNumber(record.pressure, 1)} N</span>
                          <span>{record.contactAreaLabel}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            </ControlPanelSection>
          </div>
        </aside>

        <div className="force-lab-main">
          <div className="visual-canvas force-stage-canvas">
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
            <div className="visual-grid-layer" />
            <div className="visual-glow visual-glow-a" />
            <div className="visual-glow visual-glow-b" />

            <svg
              viewBox={`0 0 ${stage.width} ${stage.height}`}
              className="force-stage-svg"
              role="img"
              aria-label="滑动摩擦实验可视化示意图"
            >
              <defs>
                <ArrowMarker id="force-arrow-gravity" color={FORCE_COLORS.gravity} />
                <ArrowMarker id="force-arrow-normal" color={FORCE_COLORS.normal} />
                <ArrowMarker id="force-arrow-pull" color={FORCE_COLORS.pull} />
                <ArrowMarker id="force-arrow-friction" color={FORCE_COLORS.friction} />
                <ArrowMarker id="force-arrow-net" color={FORCE_COLORS.net} />
              </defs>

              <rect
                x="50"
                y={stage.groundY - 10}
                width={stage.width - 100}
                height="24"
                rx="12"
                className="force-stage-surface-strip"
                fill={surfacePresetMeta.strip}
                stroke={surfacePresetMeta.accent}
                strokeOpacity="0.4"
              />

              {buildSurfaceTexture({
                width: stage.width,
                groundY: stage.groundY,
                accent: surfacePresetMeta.accent,
                roughness: surfacePresetMeta.roughness,
              })}

              <line
                x1="42"
                y1={stage.groundY}
                x2={stage.width - 48}
                y2={stage.groundY}
                className="force-stage-ground"
              />
              <text x="62" y={stage.groundY - 18} className="force-svg-caption">
                {surfacePresetMeta.label}
              </text>
              <text x="62" y={stage.groundY + 44} className="force-svg-caption">
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
                <text x={stage.startCenterX - 20} y={stage.groundY + 54} className="force-svg-caption">
                  起点
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
                  弹簧测力计
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

              <g transform={`translate(${stage.blockX}, ${stage.blockY})`}>
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

              {visibleForces.net ? (
                Math.abs(displayedScene.netForce) < 0.01 ? (
                  <g className="force-balance-badge">
                    <rect
                      x={stage.centerX - 88}
                      y={stage.blockY - 78}
                      width="176"
                      height="34"
                      rx="17"
                    />
                    <text
                      x={stage.centerX}
                      y={stage.blockY - 56}
                      textAnchor="middle"
                      className="force-balance-copy"
                    >
                      {displayedScene.phase === "uniform" || displayedScene.phase === "complete"
                        ? "匀速阶段：F拉 = f"
                        : "当前合力 = 0"}
                    </text>
                  </g>
                ) : (
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
                )
              ) : null}
            </svg>
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
                  <span className="force-stage-chip">{surfacePresetMeta.label}</span>
                  <span className="force-stage-chip">{contactAreaMeta.label}</span>
                  <span className="force-stage-chip">压力 {formatNumber(pressure, 1)} N</span>
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
                </div>
                <div className="force-stage-chip-row">
                  <span className="force-stage-chip">f静,max {formatNumber(metrics.staticLimit, 1)} N</span>
                  <span className="force-stage-chip">稳定 {formatNumber(metrics.kineticFriction, 1)} N</span>
                </div>
                <div className="force-stage-result-pill">
                  <strong>{latestRecord ? `${formatNumber(latestRecord.kineticFriction, 1)} N` : "等待实验"}</strong>
                  <span>
                    {latestRecord
                      ? `${latestRecord.surfaceLabel} · 压力 ${formatNumber(latestRecord.pressure, 1)} N · ${latestRecord.contactAreaLabel}`
                      : "完成一次实验后记录结果"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
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
  hasPlaybackStarted,
  displayedScene,
  metrics,
}: {
  hasPlaybackStarted: boolean;
  displayedScene: ExperimentScene;
  metrics: ExperimentMetrics;
}): ExperimentStatus {
  if (!hasPlaybackStarted) {
    return {
      phase: "idle",
      label: "等待开始实验",
      badge: "待播放",
      description: "点击“开始实验”后，测力计会先缓慢增大拉力，直到突破最大静摩擦，然后自动进入匀速拉动并给出测量结果。",
      formula: `预测：f = μkN = ${formatNumber(metrics.kineticFriction / metrics.normal, 2)} × ${formatNumber(metrics.normal, 1)} = ${formatNumber(metrics.kineticFriction, 1)} N`,
      progress: 0,
    };
  }

  if (displayedScene.phase === "ramping") {
    return {
      phase: "ramping",
      label: "拉力逐步增大",
      badge: "准备起动",
      description: `当前读数 ${formatNumber(displayedScene.pullForce, 1)} N。木块还没有滑动，静摩擦会始终等大反向抵消拉力，直到逼近最大静摩擦 ${formatNumber(metrics.staticLimit, 1)} N。`,
      formula: `静止阶段：F拉 = f静 ≤ f静,max = μsN = ${formatNumber(metrics.staticLimit, 1)} N`,
      progress: 0.34,
    };
  }

  if (displayedScene.phase === "breakaway") {
    return {
      phase: "breakaway",
      label: "刚突破静摩擦",
      badge: "开始滑动",
      description: `这一瞬间拉力已经大于最大静摩擦，木块从静止变为滑动。随后摩擦会从静摩擦切换为动摩擦，测力计读数也会回落到稳定值。`,
      formula: `起动瞬间：F拉 > f静,max，当前合力 ${formatNumber(displayedScene.netForce, 2)} N`,
      progress: 0.62,
    };
  }

  if (displayedScene.phase === "uniform") {
    return {
      phase: "uniform",
      label: "正在匀速测量",
      badge: "稳定读数",
      description: `木块已经进入匀速滑动，水平方向重新平衡。此时测力计稳定读数 ${formatNumber(metrics.kineticFriction, 1)} N，就是本次测得的滑动摩擦力。`,
      formula: `匀速阶段：F拉 = f = μkN = ${formatNumber(metrics.kineticFriction / metrics.normal, 2)} × ${formatNumber(metrics.normal, 1)} = ${formatNumber(metrics.kineticFriction, 1)} N`,
      progress: 0.9,
    };
  }

  return {
    phase: "complete",
    label: "实验完成",
    badge: "已记录结果",
    description: `本次实验已经完成。你可以继续修改压力、材质或摆放方式，再重新播放；下方记录区会保留最近几次的测量结果，便于横向对比。`,
    formula: `结论：滑动摩擦力 ${formatNumber(metrics.kineticFriction, 1)} N，且接触面积不进入公式 f = μkN`,
    progress: 1,
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
  metrics,
  hasPlaybackStarted,
  experimentElapsedMs,
  totalExperimentMs,
}: {
  metrics: ExperimentMetrics;
  hasPlaybackStarted: boolean;
  experimentElapsedMs: number;
  totalExperimentMs: number;
}): ExperimentScene {
  if (!hasPlaybackStarted) {
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
      frictionModeLabel: "静摩擦待命",
      stateLabel: "等待测量",
      stateTone: "balanced",
      motionState: "rest",
      isMoving: false,
      summary: "先观察器材和变量，点击开始实验后再看读数如何变化。",
      motionHint: "这个实验真正要记录的是匀速阶段的稳定读数。",
      travelProgress: 0,
      readingRatio: 0,
    };
  }

  if (experimentElapsedMs < RAMP_DURATION_MS) {
    const progress = clamp01(experimentElapsedMs / RAMP_DURATION_MS);
    const pullForce = metrics.breakawayForce * easeOutCubic(progress);
    const frictionForce = Math.min(pullForce, metrics.staticLimit);
    const nearThreshold = pullForce >= metrics.staticLimit * 0.88;
    const netForce = Math.max(0, pullForce - frictionForce);

    return {
      phase: "ramping",
      weight: metrics.weight,
      normal: metrics.normal,
      pullForce,
      frictionForce,
      netForce,
      acceleration: netForce / metrics.massEquivalent,
      staticLimit: metrics.staticLimit,
      kineticFriction: metrics.kineticFriction,
      frictionModeLabel: nearThreshold ? "接近最大静摩擦" : "静摩擦平衡",
      stateLabel: nearThreshold ? "接近起动" : "仍未滑动",
      stateTone: nearThreshold ? "warning" : "balanced",
      motionState: nearThreshold ? "threshold" : "rest",
      isMoving: false,
      summary: "拉力在变大，但静摩擦仍然跟得上。",
      motionHint: "当拉力第一次超过最大静摩擦时，木块才会开始滑动。",
      travelProgress: 0,
      readingRatio: pullForce / metrics.breakawayForce,
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
      summary: "木块刚突破最大静摩擦，开始从静止转为滑动。",
      motionHint: "继续观察读数，它会回落到更稳定的动摩擦值。",
      travelProgress: 0.28 * easeOutCubic(progress),
      readingRatio: pullForce / metrics.breakawayForce,
    };
  }

  if (experimentElapsedMs < totalExperimentMs) {
    const progress = clamp01(
      (experimentElapsedMs - RAMP_DURATION_MS - BREAKAWAY_DURATION_MS) / UNIFORM_DURATION_MS,
    );

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
      summary: "木块已经匀速运动，实验进入真正的测量阶段。",
      motionHint: "这时测力计稳定读数 = 滑动摩擦力。",
      travelProgress: 0.28 + 0.72 * easeInOutCubic(progress),
      readingRatio: metrics.kineticFriction / metrics.breakawayForce,
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
    summary: "本次实验已经完成，可以和前一次结果做对照。",
    motionHint: "切换材质或压力后，最值得关注的是稳定读数如何变化。",
    travelProgress: 1,
    readingRatio: metrics.kineticFriction / metrics.breakawayForce,
  };
}

function computeStageLayout({
  contactAreaMeta,
  travelProgress,
  pressure,
}: {
  contactAreaMeta: ContactAreaPreset;
  travelProgress: number;
  pressure: number;
}): StageLayout {
  const width = 920;
  const height = 520;
  const groundY = 392;
  const startX = 248;
  const maxTravel = 230;
  const travel = maxTravel * travelProgress;
  const blockX = startX + travel;
  const blockWidth = contactAreaMeta.blockWidth;
  const blockHeight = contactAreaMeta.blockHeight;
  const blockY = groundY - blockHeight - 18;
  const centerX = blockX + blockWidth / 2;
  const centerY = blockY + blockHeight / 2;
  const springX = 692;
  const springY = 188;
  const ropeStartX = blockX + blockWidth;
  const ropeEndX = springX + 154;
  const weightCount = Math.max(0, Math.round((pressure - 2) / 2));
  const perRow = blockWidth >= 140 ? 2 : 1;
  const weightSlots = Array.from({ length: weightCount }, (_, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const totalRowWidth = perRow * 36 - 6;
    const x = blockWidth / 2 - totalRowWidth / 2 + col * 36;
    const y = -24 - row * 26;

    return { x, y };
  });

  return {
    width,
    height,
    groundY,
    blockX,
    blockY,
    blockWidth,
    blockHeight,
    centerX,
    centerY,
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
  width,
  groundY,
  accent,
  roughness,
}: {
  width: number;
  groundY: number;
  accent: string;
  roughness: number;
}) {
  const lines = Array.from({ length: 18 }, (_, index) => {
    const x = 76 + index * 42;
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
        x1="48"
        y1={groundY + 18}
        x2={width - 52}
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

  return 50 + (magnitude / maxMagnitude) * 82;
}

function getSuggestedForceForElapsedMs(
  elapsedMs: number,
  totalExperimentMs: number,
): ForceKey {
  if (elapsedMs <= 0) {
    return "gravity";
  }

  if (elapsedMs < RAMP_DURATION_MS) {
    return "pull";
  }

  if (elapsedMs < RAMP_DURATION_MS + BREAKAWAY_DURATION_MS) {
    return "net";
  }

  if (elapsedMs >= totalExperimentMs) {
    return "friction";
  }

  return "friction";
}

function formatSignedNumber(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value, 1)}`;
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - ((-2 * value + 2) ** 3) / 2;
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
    return { x: anchorX - width / 2, y: endY - 38, width };
  }

  return { x: anchorX - width / 2, y: endY + 10, width };
}

function formatNumber(value: number, digits: number) {
  const fixed = value.toFixed(digits);
  return fixed.replace(/\.0+$|(\.\d*[1-9])0+$/, "$1");
}
