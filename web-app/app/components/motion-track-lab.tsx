import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

import type { TeachingTopic } from "../data/teaching-catalog";

type MotionMode = "uniform" | "accelerating" | "braking";
type PlaybackRate = 0.75 | 1 | 1.5;
type ViewOptionKey = "showTrail" | "showSamples" | "showVelocityCurve";
type Tone = "balanced" | "warning" | "active";

type MotionTrackLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type MotionPreset = {
  mode: MotionMode;
  badge: string;
  label: string;
  description: string;
  initialVelocity: number;
  acceleration: number;
  duration: number;
  accent: string;
  accentSoft: string;
};

type MotionSample = {
  time: number;
  position: number;
  velocity: number;
  acceleration: number;
  hasStopped: boolean;
  stopTime: number | null;
};

type MotionSummary = {
  stateTone: Tone;
  stateLabel: string;
  observation: string;
  conclusion: string;
  velocityFormula: string;
  displacementFormula: string;
};

type RangeControlProps = {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

const MOTION_PRESETS: Record<MotionMode, MotionPreset> = {
  uniform: {
    mode: "uniform",
    badge: "匀速",
    label: "匀速直线",
    description: "每秒位移保持一致，最适合先建立速度和位移的直觉。",
    initialVelocity: 2.4,
    acceleration: 0,
    duration: 8,
    accent: "#67c6ff",
    accentSoft: "rgba(103, 198, 255, 0.22)",
  },
  accelerating: {
    mode: "accelerating",
    badge: "加速",
    label: "匀加速",
    description: "速度逐渐增大，轨道上的采样点会越来越疏。",
    initialVelocity: 1.2,
    acceleration: 0.65,
    duration: 8,
    accent: "#5de2b1",
    accentSoft: "rgba(93, 226, 177, 0.22)",
  },
  braking: {
    mode: "braking",
    badge: "减速",
    label: "匀减速",
    description: "速度逐渐减小，直到停止，适合讲刹停过程。",
    initialVelocity: 4.6,
    acceleration: -0.8,
    duration: 8,
    accent: "#ffbf67",
    accentSoft: "rgba(255, 191, 103, 0.22)",
  },
};

const PLAYBACK_RATES: PlaybackRate[] = [0.75, 1, 1.5];

const DEFAULT_VIEW_OPTIONS: Record<ViewOptionKey, boolean> = {
  showTrail: true,
  showSamples: true,
  showVelocityCurve: true,
};

const SVG_STAGE = {
  width: 1320,
  height: 820,
  panelX: 72,
  panelY: 82,
  panelWidth: 1176,
  trackPanelHeight: 246,
  trackLeft: 138,
  trackRight: 1164,
  trackY: 246,
  graphY: 390,
  graphGap: 24,
  graphHeight: 310,
};

const TRACK_TICK_COUNT = 5;
const GRAPH_GRID_STEPS = 4;
const GRAPH_SAMPLE_COUNT = 80;

export function MotionTrackLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: MotionTrackLabProps) {
  const [mode, setMode] = useState<MotionMode>("uniform");
  const [initialVelocity, setInitialVelocity] = useState(MOTION_PRESETS.uniform.initialVelocity);
  const [acceleration, setAcceleration] = useState(MOTION_PRESETS.uniform.acceleration);
  const [duration, setDuration] = useState(MOTION_PRESETS.uniform.duration);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewOptions, setViewOptions] =
    useState<Record<ViewOptionKey, boolean>>(DEFAULT_VIEW_OPTIONS);
  const frameRef = useRef<number | null>(null);

  const preset = MOTION_PRESETS[mode];

  useEffect(() => {
    if (!isPlaying) {
      frameRef.current = null;
      return;
    }

    let animationFrameId = 0;

    function advanceFrame(timestamp: number) {
      if (frameRef.current === null) {
        frameRef.current = timestamp;
      }

      const elapsedSeconds = ((timestamp - frameRef.current) / 1000) * playbackRate;
      frameRef.current = timestamp;

      setCurrentTime((previous) => Math.min(previous + elapsedSeconds, duration));
      animationFrameId = window.requestAnimationFrame(advanceFrame);
    }

    animationFrameId = window.requestAnimationFrame(advanceFrame);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [duration, isPlaying, playbackRate]);

  useEffect(() => {
    if (currentTime < duration || !isPlaying) {
      return;
    }

    setIsPlaying(false);
  }, [currentTime, duration, isPlaying]);

  const motionSeries = useMemo(
    () =>
      buildMotionSeries({
        duration,
        initialVelocity,
        acceleration,
        segments: GRAPH_SAMPLE_COUNT,
      }),
    [acceleration, duration, initialVelocity],
  );

  const currentMotion = useMemo(
    () =>
      resolveMotionAtTime({
        time: currentTime,
        duration,
        initialVelocity,
        acceleration,
      }),
    [acceleration, currentTime, duration, initialVelocity],
  );

  const endMotion = motionSeries[motionSeries.length - 1] ?? currentMotion;
  const peakVelocity = motionSeries.reduce((max, sample) => Math.max(max, sample.velocity), 0);
  const maxDistanceValue = motionSeries.reduce((max, sample) => Math.max(max, sample.position), 0);
  const distanceDomain = Math.max(6, maxDistanceValue * 1.06 || 0);
  const velocityDomain = Math.max(1, peakVelocity * 1.08 || 0);
  const playedSeries = useMemo(
    () => buildPlayedSeries({ series: motionSeries, currentSample: currentMotion }),
    [currentMotion, motionSeries],
  );
  const summary = useMemo(
    () =>
      describeMotion({
        mode,
        currentTime,
        duration,
        isPlaying,
        currentMotion,
        initialVelocity,
        acceleration,
      }),
    [acceleration, currentMotion, currentTime, duration, initialVelocity, isPlaying, mode],
  );

  const trackWidth = SVG_STAGE.trackRight - SVG_STAGE.trackLeft;
  const currentTrackX =
    SVG_STAGE.trackLeft +
    trackWidth * (distanceDomain === 0 ? 0 : currentMotion.position / distanceDomain);
  const stopTrackX =
    currentMotion.stopTime && currentMotion.stopTime < duration
      ? SVG_STAGE.trackLeft +
        trackWidth *
          (distanceDomain === 0
            ? 0
            : resolveMotionAtTime({
                time: currentMotion.stopTime,
                duration,
                initialVelocity,
                acceleration,
              }).position / distanceDomain)
      : null;

  const graphWidth = (SVG_STAGE.panelWidth - SVG_STAGE.graphGap) / 2;
  const graphPadding = { top: 48, right: 26, bottom: 34, left: 48 };
  const displacementGraph = buildGraphGeometry({
    series: motionSeries,
    playedSeries,
    width: graphWidth,
    height: SVG_STAGE.graphHeight,
    x: SVG_STAGE.panelX,
    y: SVG_STAGE.graphY,
    duration,
    minValue: 0,
    maxValue: distanceDomain,
    mapValue: (sample) => sample.position,
  });
  const velocityGraph = buildGraphGeometry({
    series: motionSeries,
    playedSeries,
    width: graphWidth,
    height: SVG_STAGE.graphHeight,
    x: SVG_STAGE.panelX + graphWidth + SVG_STAGE.graphGap,
    y: SVG_STAGE.graphY,
    duration,
    minValue: 0,
    maxValue: velocityDomain,
    mapValue: (sample) => sample.velocity,
  });

  const currentDisplacementPoint = {
    x: displacementGraph.mapTime(currentMotion.time),
    y: displacementGraph.mapValue(currentMotion.position),
  };
  const currentVelocityPoint = {
    x: velocityGraph.mapTime(currentMotion.time),
    y: velocityGraph.mapValue(currentMotion.velocity),
  };

  const secondMarkers = buildSecondMarkers({
    duration,
    initialVelocity,
    acceleration,
  });

  const hasEnded = currentTime >= duration;
  const hasProgress = currentTime > 0;
  const primaryActionLabel = isPlaying
    ? "暂停播放"
    : hasEnded
      ? "重新播放"
      : hasProgress
        ? "继续播放"
        : "开始播放";
  const progress = duration === 0 ? 0 : currentTime / duration;
  const velocityArrowLength =
    currentMotion.velocity <= 0 ? 0 : 72 + 110 * (currentMotion.velocity / velocityDomain);
  const motionThemeStyle = {
    "--motion-accent": preset.accent,
    "--motion-accent-soft": preset.accentSoft,
  } as CSSProperties;

  function applyPreset(nextMode: MotionMode) {
    const nextPreset = MOTION_PRESETS[nextMode];
    setMode(nextMode);
    setInitialVelocity(nextPreset.initialVelocity);
    setAcceleration(nextPreset.acceleration);
    setDuration(nextPreset.duration);
    setCurrentTime(0);
    setIsPlaying(false);
  }

  function startPlayback() {
    if (currentTime >= duration) {
      setCurrentTime(0);
    }

    setIsPlaying(true);
  }

  function pausePlayback() {
    setIsPlaying(false);
  }

  function resetDefaults() {
    setMode("uniform");
    setInitialVelocity(MOTION_PRESETS.uniform.initialVelocity);
    setAcceleration(MOTION_PRESETS.uniform.acceleration);
    setDuration(MOTION_PRESETS.uniform.duration);
    setPlaybackRate(1);
    setCurrentTime(0);
    setIsPlaying(false);
    setViewOptions(DEFAULT_VIEW_OPTIONS);
  }

  function restartPlayback() {
    setCurrentTime(0);
    setIsPlaying(true);
  }

  function updateVelocity(value: number) {
    setInitialVelocity(value);
    setIsPlaying(false);
  }

  function updateAcceleration(value: number) {
    setAcceleration(value);
    setIsPlaying(false);
  }

  function updateDuration(nextDuration: number) {
    setDuration(nextDuration);
    setCurrentTime((previous) => Math.min(previous, nextDuration));
    setIsPlaying(false);
  }

  function toggleView(key: ViewOptionKey) {
    setViewOptions((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  }

  return (
    <section ref={fullscreenRef} className="visual-shell force-lab-shell motion-lab-shell" style={motionThemeStyle}>
      <div className="force-lab-layout motion-lab-layout">
        <aside className="force-control-panel motion-control-panel">
          <div className="force-control-header">
            <div className="force-control-title-block">
              <h4 className="force-control-title">控制面板</h4>
              <p className="force-control-copy">调参数、播放、看轨道和曲线联动。</p>
            </div>
          </div>

          <div className="force-control-scroll motion-control-scroll">
            <section className="force-control-section force-control-section-accent">
              <div className="force-control-section-head">
                <h5 className="force-control-section-title">播放控制</h5>
                <span className="force-section-hint">先看轨道，再对照位移和速度曲线</span>
              </div>

              <div className="force-toolbar-status">
                <span className={`force-state-pill is-${summary.stateTone}`}>{summary.stateLabel}</span>
                <span className="force-quick-pill">{preset.label}</span>
                <span className="force-quick-pill">总时长 {formatNumber(duration, 1)} s</span>
              </div>

              <div className="force-action-grid">
                <button
                  type="button"
                  className="force-primary-button"
                  onClick={() => {
                    if (isPlaying) {
                      pausePlayback();
                      return;
                    }

                    startPlayback();
                  }}
                >
                  {primaryActionLabel}
                </button>
                <button type="button" className="force-ghost-button" onClick={restartPlayback}>
                  从头播放
                </button>
                <button type="button" className="force-ghost-button" onClick={resetDefaults}>
                  恢复默认
                </button>
              </div>

              <div className="force-control-stack">
                <div className="force-control-label-row">
                  <span className="force-control-label">时间轴</span>
                  <span className="force-control-value">
                    {formatNumber(currentTime, 1)} / {formatNumber(duration, 1)} s
                  </span>
                </div>
                <input
                  className="force-range-input"
                  type="range"
                  min={0}
                  max={duration}
                  step={0.05}
                  value={Math.min(currentTime, duration)}
                  onChange={(event) => {
                    setCurrentTime(Number(event.target.value));
                    setIsPlaying(false);
                  }}
                />
              </div>

              <div className="force-segmented motion-rate-grid">
                {PLAYBACK_RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    className={playbackRate === rate ? "force-segmented-button is-active" : "force-segmented-button"}
                    onClick={() => setPlaybackRate(rate)}
                  >
                    {rate === 1 ? "1x" : `${rate}x`}
                  </button>
                ))}
              </div>
            </section>

            <section className="force-control-section">
              <div className="force-control-section-head">
                <h5 className="force-control-section-title">运动模式</h5>
                <span className="force-section-hint">直接切换三个最常用的教学场景</span>
              </div>

              <div className="motion-mode-grid">
                {Object.values(MOTION_PRESETS).map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    className={mode === item.mode ? "motion-mode-card is-active" : "motion-mode-card"}
                    onClick={() => applyPreset(item.mode)}
                  >
                    <span className="motion-mode-badge">{item.badge}</span>
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="force-control-section">
              <div className="force-control-section-head">
                <h5 className="force-control-section-title">运动参数</h5>
                <span className="force-section-hint">参数修改后右侧轨道和曲线会立即联动</span>
              </div>

              <RangeControl
                id="motion-track-v0"
                label="初速度"
                unit="m/s"
                min={0.4}
                max={6}
                step={0.1}
                value={initialVelocity}
                onChange={updateVelocity}
              />

              <RangeControl
                id="motion-track-acceleration"
                label={mode === "braking" ? "加速度（负）" : "加速度"}
                unit="m/s²"
                min={mode === "braking" ? -2.2 : mode === "uniform" ? 0 : 0.2}
                max={mode === "braking" ? -0.2 : mode === "uniform" ? 0 : 1.8}
                step={mode === "uniform" ? 1 : 0.05}
                value={mode === "uniform" ? 0 : acceleration}
                disabled={mode === "uniform"}
                onChange={updateAcceleration}
              />

              <RangeControl
                id="motion-track-duration"
                label="演示时长"
                unit="s"
                min={4}
                max={12}
                step={0.5}
                value={duration}
                onChange={updateDuration}
              />

              <div className="force-insight-grid force-insight-grid-compact">
                <article className="force-insight-card">
                  <span className="force-insight-label">总位移</span>
                  <strong className="force-insight-value">{formatNumber(endMotion.position, 1)} m</strong>
                </article>
                <article className="force-insight-card">
                  <span className="force-insight-label">{mode === "braking" ? "刹停时刻" : "峰值速度"}</span>
                  <strong className="force-insight-value">
                    {mode === "braking" && currentMotion.stopTime && currentMotion.stopTime < duration
                      ? `${formatNumber(currentMotion.stopTime, 1)} s`
                      : `${formatNumber(peakVelocity, 1)} m/s`}
                  </strong>
                </article>
              </div>
            </section>

            <section className="force-control-section">
              <div className="force-control-section-head">
                <h5 className="force-control-section-title">辅助显示</h5>
                <span className="force-section-hint">按教学需要保留或隐藏辅助信息</span>
              </div>

              <div className="motion-view-grid">
                <button
                  type="button"
                  className={viewOptions.showTrail ? "motion-view-card is-active" : "motion-view-card"}
                  onClick={() => toggleView("showTrail")}
                >
                  <span className="motion-view-copy">
                    <strong>位移拖尾</strong>
                    <span>直接看出当前已经移动了多远。</span>
                  </span>
                  <span className="motion-view-switch">{viewOptions.showTrail ? "开" : "关"}</span>
                </button>
                <button
                  type="button"
                  className={viewOptions.showSamples ? "motion-view-card is-active" : "motion-view-card"}
                  onClick={() => toggleView("showSamples")}
                >
                  <span className="motion-view-copy">
                    <strong>秒级采样点</strong>
                    <span>比较相同时间间隔内的位移变化。</span>
                  </span>
                  <span className="motion-view-switch">{viewOptions.showSamples ? "开" : "关"}</span>
                </button>
                <button
                  type="button"
                  className={viewOptions.showVelocityCurve ? "motion-view-card is-active" : "motion-view-card"}
                  onClick={() => toggleView("showVelocityCurve")}
                >
                  <span className="motion-view-copy">
                    <strong>速度曲线</strong>
                    <span>对照轨道上的快慢变化，一眼看出速度趋势。</span>
                  </span>
                  <span className="motion-view-switch">{viewOptions.showVelocityCurve ? "开" : "关"}</span>
                </button>
              </div>
            </section>

            <section className="force-control-section">
              <div className="force-control-section-head">
                <h5 className="force-control-section-title">教学观察</h5>
                <span className="force-section-hint">这里保留口语化结论，方便直接讲解</span>
              </div>

              <div className="force-highlight-row is-panel">
                {topic.highlights.map((item) => (
                  <span key={item} className="force-highlight-chip">
                    {item}
                  </span>
                ))}
              </div>

              <p className="force-inline-copy">{summary.observation}</p>
              <p className="force-inline-copy">{summary.conclusion}</p>
              <p className="force-inline-copy">{summary.displacementFormula}</p>
              <p className="force-inline-copy">{summary.velocityFormula}</p>
            </section>
          </div>
        </aside>

        <div className="force-lab-main motion-lab-main">
          <div className="visual-canvas motion-stage-canvas">
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
            <div className="visual-line visual-line-a" />
            <div className="visual-line visual-line-b" />

            <svg
              viewBox={`0 0 ${SVG_STAGE.width} ${SVG_STAGE.height}`}
              className="motion-stage-svg"
              role="img"
              aria-label="速度与位移轨迹可视化示意图"
            >
              <defs>
                <linearGradient id="motion-stage-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={preset.accentSoft} />
                  <stop offset="48%" stopColor={preset.accent} />
                  <stop offset="100%" stopColor="#67c6ff" />
                </linearGradient>
                <linearGradient id="motion-stage-fill-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={preset.accentSoft} />
                  <stop offset="100%" stopColor="rgba(103, 198, 255, 0.02)" />
                </linearGradient>
                <marker
                  id="motion-arrow"
                  viewBox="0 0 12 12"
                  refX="10"
                  refY="6"
                  markerWidth="9"
                  markerHeight="9"
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L12,6 L0,12 z" fill={preset.accent} />
                </marker>
              </defs>

              <rect
                x={SVG_STAGE.panelX}
                y={SVG_STAGE.panelY}
                width={SVG_STAGE.panelWidth}
                height={SVG_STAGE.trackPanelHeight}
                rx="34"
                className="motion-stage-panel-shell"
              />

              <text x={SVG_STAGE.panelX + 36} y={SVG_STAGE.panelY + 38} className="motion-stage-panel-title">
                轨道视图
              </text>
              <text x={SVG_STAGE.panelX + 36} y={SVG_STAGE.panelY + 66} className="motion-stage-panel-copy">
                看秒级采样点间距，就能直观判断速度是否变化。
              </text>

              {Array.from({ length: TRACK_TICK_COUNT }).map((_, index) => {
                const ratio = index / (TRACK_TICK_COUNT - 1);
                const x = SVG_STAGE.trackLeft + trackWidth * ratio;
                return (
                  <g key={`track-tick-${index}`}>
                    <line
                      x1={x}
                      y1={SVG_STAGE.trackY - 24}
                      x2={x}
                      y2={SVG_STAGE.trackY + 30}
                      className="motion-stage-ruler-tick"
                    />
                    <text x={x} y={SVG_STAGE.trackY + 54} textAnchor="middle" className="motion-stage-ruler-label">
                      {formatNumber(distanceDomain * ratio, 1)} m
                    </text>
                  </g>
                );
              })}

              <line
                x1={SVG_STAGE.trackLeft}
                y1={SVG_STAGE.trackY}
                x2={SVG_STAGE.trackRight}
                y2={SVG_STAGE.trackY}
                className="motion-stage-track-line"
              />

              {viewOptions.showTrail ? (
                <>
                  <line
                    x1={SVG_STAGE.trackLeft}
                    y1={SVG_STAGE.trackY}
                    x2={currentTrackX}
                    y2={SVG_STAGE.trackY}
                    className="motion-stage-distance-line"
                  />
                  <line
                    x1={currentTrackX}
                    y1={SVG_STAGE.trackY}
                    x2={currentTrackX}
                    y2={SVG_STAGE.trackY - 58}
                    className="motion-stage-guide-line"
                  />
                </>
              ) : null}

              <circle cx={SVG_STAGE.trackLeft} cy={SVG_STAGE.trackY} r="8" className="motion-stage-origin-dot" />
              <text x={SVG_STAGE.trackLeft - 10} y={SVG_STAGE.trackY - 34} className="motion-stage-ruler-label">
                原点
              </text>

              {viewOptions.showSamples
                ? secondMarkers.map((sample) => {
                    const sampleTrackX =
                      SVG_STAGE.trackLeft +
                      trackWidth * (distanceDomain === 0 ? 0 : sample.position / distanceDomain);
                    const isPast = sample.time <= currentTime + 0.0001;

                    return (
                      <g key={`sample-${sample.time}`}>
                        <line
                          x1={sampleTrackX}
                          y1={SVG_STAGE.trackY - 76}
                          x2={sampleTrackX}
                          y2={SVG_STAGE.trackY - 18}
                          className={isPast ? "motion-stage-sample-stem is-past" : "motion-stage-sample-stem"}
                        />
                        <circle
                          cx={sampleTrackX}
                          cy={SVG_STAGE.trackY - 76}
                          r="7"
                          className={isPast ? "motion-stage-sample-dot is-past" : "motion-stage-sample-dot"}
                        />
                        <text
                          x={sampleTrackX}
                          y={SVG_STAGE.trackY - 94}
                          textAnchor="middle"
                          className="motion-stage-time-label"
                        >
                          {formatTimeLabel(sample.time)}
                        </text>
                      </g>
                    );
                  })
                : null}

              {stopTrackX !== null ? (
                <g>
                  <line
                    x1={stopTrackX}
                    y1={SVG_STAGE.trackY - 108}
                    x2={stopTrackX}
                    y2={SVG_STAGE.trackY + 38}
                    className="motion-stage-stop-line"
                  />
                  <text x={stopTrackX} y={SVG_STAGE.trackY - 124} textAnchor="middle" className="motion-stage-stop-label">
                    停止点
                  </text>
                </g>
              ) : null}

              <ellipse
                cx={currentTrackX}
                cy={SVG_STAGE.trackY + 58}
                rx="72"
                ry="18"
                className="motion-stage-cart-shadow"
              />

              <g transform={`translate(${currentTrackX - 48}, ${SVG_STAGE.trackY - 80})`}>
                <rect width="96" height="58" rx="24" className="motion-stage-cart-body" />
                <rect x="10" y="10" width="76" height="38" rx="18" className="motion-stage-cart-inner" />
                <circle cx="72" cy="30" r="8" className="motion-stage-cart-front" />
                <circle cx="24" cy="64" r="10" className="motion-stage-wheel" />
                <circle cx="72" cy="64" r="10" className="motion-stage-wheel" />
                <text x="48" y="34" textAnchor="middle" className="motion-stage-cart-label">
                  小车
                </text>
              </g>

              <text x={currentTrackX} y={SVG_STAGE.trackY - 122} textAnchor="middle" className="motion-stage-value-callout">
                s = {formatNumber(currentMotion.position, 1)} m
              </text>

              {velocityArrowLength > 0 ? (
                <g>
                  <line
                    x1={currentTrackX + 58}
                    y1={SVG_STAGE.trackY - 44}
                    x2={currentTrackX + 58 + velocityArrowLength}
                    y2={SVG_STAGE.trackY - 44}
                    className="motion-stage-velocity-arrow"
                    markerEnd="url(#motion-arrow)"
                  />
                  <text
                    x={currentTrackX + 70 + velocityArrowLength / 2}
                    y={SVG_STAGE.trackY - 60}
                    textAnchor="middle"
                    className="motion-stage-value-callout"
                  >
                    v = {formatNumber(currentMotion.velocity, 1)} m/s
                  </text>
                </g>
              ) : null}

              <rect
                x={SVG_STAGE.panelX}
                y={SVG_STAGE.graphY}
                width={graphWidth}
                height={SVG_STAGE.graphHeight}
                rx="28"
                className="motion-stage-graph-shell"
              />
              <text x={SVG_STAGE.panelX + 28} y={SVG_STAGE.graphY + 34} className="motion-stage-panel-title">
                位移 - 时间
              </text>
              <text x={SVG_STAGE.panelX + 28} y={SVG_STAGE.graphY + 60} className="motion-stage-panel-copy">
                曲线斜率越大，表示速度越快。
              </text>

              {Array.from({ length: GRAPH_GRID_STEPS + 1 }).map((_, index) => {
                const ratio = index / GRAPH_GRID_STEPS;
                const y =
                  SVG_STAGE.graphY + graphPadding.top + (SVG_STAGE.graphHeight - graphPadding.top - graphPadding.bottom) * ratio;
                const value = distanceDomain * (1 - ratio);

                return (
                  <g key={`displacement-grid-${index}`}>
                    <line
                      x1={SVG_STAGE.panelX + graphPadding.left}
                      y1={y}
                      x2={SVG_STAGE.panelX + graphWidth - graphPadding.right}
                      y2={y}
                      className="motion-stage-graph-grid"
                    />
                    <text
                      x={SVG_STAGE.panelX + 18}
                      y={y + 4}
                      textAnchor="start"
                      className="motion-stage-graph-axis-label"
                    >
                      {formatNumber(value, 1)}
                    </text>
                  </g>
                );
              })}

              {Array.from({ length: TRACK_TICK_COUNT }).map((_, index) => {
                const ratio = index / (TRACK_TICK_COUNT - 1);
                const x = displacementGraph.mapTime(duration * ratio);

                return (
                  <g key={`displacement-time-${index}`}>
                    <line
                      x1={x}
                      y1={SVG_STAGE.graphY + graphPadding.top}
                      x2={x}
                      y2={SVG_STAGE.graphY + SVG_STAGE.graphHeight - graphPadding.bottom}
                      className="motion-stage-graph-grid"
                    />
                    <text
                      x={x}
                      y={SVG_STAGE.graphY + SVG_STAGE.graphHeight - 10}
                      textAnchor="middle"
                      className="motion-stage-graph-axis-label"
                    >
                      {formatNumber(duration * ratio, 1)}s
                    </text>
                  </g>
                );
              })}

              <path d={displacementGraph.fullAreaPath} className="motion-stage-graph-area" />
              <polyline points={displacementGraph.fullPolyline} className="motion-stage-graph-line is-muted" />
              <polyline points={displacementGraph.playedPolyline} className="motion-stage-graph-line" />
              <line
                x1={currentDisplacementPoint.x}
                y1={SVG_STAGE.graphY + graphPadding.top}
                x2={currentDisplacementPoint.x}
                y2={SVG_STAGE.graphY + SVG_STAGE.graphHeight - graphPadding.bottom}
                className="motion-stage-guide-line is-chart"
              />
              <circle
                cx={currentDisplacementPoint.x}
                cy={currentDisplacementPoint.y}
                r="7"
                className="motion-stage-graph-point"
              />

              <rect
                x={SVG_STAGE.panelX + graphWidth + SVG_STAGE.graphGap}
                y={SVG_STAGE.graphY}
                width={graphWidth}
                height={SVG_STAGE.graphHeight}
                rx="28"
                className="motion-stage-graph-shell"
              />
              <text
                x={SVG_STAGE.panelX + graphWidth + SVG_STAGE.graphGap + 28}
                y={SVG_STAGE.graphY + 34}
                className="motion-stage-panel-title"
              >
                速度 - 时间
              </text>
              <text
                x={SVG_STAGE.panelX + graphWidth + SVG_STAGE.graphGap + 28}
                y={SVG_STAGE.graphY + 60}
                className="motion-stage-panel-copy"
              >
                这条线越高，说明同一时刻速度越大。
              </text>

              {Array.from({ length: GRAPH_GRID_STEPS + 1 }).map((_, index) => {
                const ratio = index / GRAPH_GRID_STEPS;
                const y =
                  SVG_STAGE.graphY + graphPadding.top + (SVG_STAGE.graphHeight - graphPadding.top - graphPadding.bottom) * ratio;
                const value = velocityDomain * (1 - ratio);

                return (
                  <g key={`velocity-grid-${index}`}>
                    <line
                      x1={SVG_STAGE.panelX + graphWidth + SVG_STAGE.graphGap + graphPadding.left}
                      y1={y}
                      x2={SVG_STAGE.panelX + SVG_STAGE.panelWidth - graphPadding.right}
                      y2={y}
                      className="motion-stage-graph-grid"
                    />
                    <text
                      x={SVG_STAGE.panelX + graphWidth + SVG_STAGE.graphGap + 18}
                      y={y + 4}
                      textAnchor="start"
                      className="motion-stage-graph-axis-label"
                    >
                      {formatNumber(value, 1)}
                    </text>
                  </g>
                );
              })}

              {Array.from({ length: TRACK_TICK_COUNT }).map((_, index) => {
                const ratio = index / (TRACK_TICK_COUNT - 1);
                const x = velocityGraph.mapTime(duration * ratio);

                return (
                  <g key={`velocity-time-${index}`}>
                    <line
                      x1={x}
                      y1={SVG_STAGE.graphY + graphPadding.top}
                      x2={x}
                      y2={SVG_STAGE.graphY + SVG_STAGE.graphHeight - graphPadding.bottom}
                      className="motion-stage-graph-grid"
                    />
                    <text
                      x={x}
                      y={SVG_STAGE.graphY + SVG_STAGE.graphHeight - 10}
                      textAnchor="middle"
                      className="motion-stage-graph-axis-label"
                    >
                      {formatNumber(duration * ratio, 1)}s
                    </text>
                  </g>
                );
              })}

              {viewOptions.showVelocityCurve ? (
                <>
                  <path d={velocityGraph.fullAreaPath} className="motion-stage-graph-area is-secondary" />
                  <polyline points={velocityGraph.fullPolyline} className="motion-stage-graph-line is-secondary-muted" />
                  <polyline points={velocityGraph.playedPolyline} className="motion-stage-graph-line is-secondary" />
                  <line
                    x1={currentVelocityPoint.x}
                    y1={SVG_STAGE.graphY + graphPadding.top}
                    x2={currentVelocityPoint.x}
                    y2={SVG_STAGE.graphY + SVG_STAGE.graphHeight - graphPadding.bottom}
                    className="motion-stage-guide-line is-chart"
                  />
                  <circle
                    cx={currentVelocityPoint.x}
                    cy={currentVelocityPoint.y}
                    r="7"
                    className="motion-stage-graph-point is-secondary"
                  />
                </>
              ) : (
                <text
                  x={SVG_STAGE.panelX + graphWidth + SVG_STAGE.graphGap + graphWidth / 2}
                  y={SVG_STAGE.graphY + SVG_STAGE.graphHeight / 2}
                  textAnchor="middle"
                  className="motion-stage-graph-placeholder"
                >
                  速度曲线已隐藏，可在左侧重新打开
                </text>
              )}
            </svg>

            <div className="motion-stage-overlay is-top-left">
              <div className="motion-stage-hud-card">
                <div className="motion-stage-hud-head">
                  <span className="motion-stage-mode-pill">{preset.badge}</span>
                  <span className={`force-state-pill is-${summary.stateTone}`}>{summary.stateLabel}</span>
                </div>
                <p className="motion-stage-note">{summary.observation}</p>
                <div className="motion-stage-progress-inline">
                  <span style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="motion-stage-overlay is-bottom-left">
              <div className="motion-stage-hud-card">
                <div className="motion-stage-stat-grid">
                  <article className="motion-stage-stat-card">
                    <span>时间</span>
                    <strong>{formatNumber(currentMotion.time, 1)} s</strong>
                  </article>
                  <article className="motion-stage-stat-card">
                    <span>速度</span>
                    <strong>{formatNumber(currentMotion.velocity, 1)} m/s</strong>
                  </article>
                  <article className="motion-stage-stat-card">
                    <span>位移</span>
                    <strong>{formatNumber(currentMotion.position, 1)} m</strong>
                  </article>
                  <article className="motion-stage-stat-card">
                    <span>加速度</span>
                    <strong>{formatNumber(currentMotion.acceleration, 2)} m/s²</strong>
                  </article>
                </div>
              </div>
            </div>

            <div className="motion-stage-overlay is-bottom-right">
              <div className="motion-stage-hud-card is-compact">
                <p className="surface-eyebrow">当前结论</p>
                <strong className="motion-stage-conclusion">{summary.conclusion}</strong>
                <p className="motion-stage-note is-compact">{summary.displacementFormula}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RangeControl({
  id,
  label,
  unit,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: RangeControlProps) {
  return (
    <div className={disabled ? "force-control-stack is-disabled" : "force-control-stack"}>
      <div className="force-control-label-row">
        <label htmlFor={id} className="force-control-label">
          {label}
        </label>
        <span className="force-control-value">
          {formatNumber(value, step < 0.1 ? 2 : 1)} {unit}
        </span>
      </div>
      <input
        id={id}
        className="force-range-input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
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

function buildMotionSeries({
  duration,
  initialVelocity,
  acceleration,
  segments,
}: {
  duration: number;
  initialVelocity: number;
  acceleration: number;
  segments: number;
}) {
  return Array.from({ length: segments + 1 }, (_, index) =>
    resolveMotionAtTime({
      time: (duration * index) / segments,
      duration,
      initialVelocity,
      acceleration,
    }),
  );
}

function buildPlayedSeries({
  series,
  currentSample,
}: {
  series: MotionSample[];
  currentSample: MotionSample;
}) {
  const played = series.filter((sample) => sample.time < currentSample.time);
  const lastPlayed = played[played.length - 1];

  if (!lastPlayed || Math.abs(lastPlayed.time - currentSample.time) > 0.0001) {
    played.push(currentSample);
  }

  if (played.length === 0) {
    return [currentSample];
  }

  return played;
}

function resolveMotionAtTime({
  time,
  duration,
  initialVelocity,
  acceleration,
}: {
  time: number;
  duration: number;
  initialVelocity: number;
  acceleration: number;
}) {
  const clampedTime = clamp(time, 0, duration);

  if (acceleration < 0) {
    const stopTime = initialVelocity / Math.abs(acceleration);

    if (clampedTime >= stopTime) {
      const positionAtStop = initialVelocity * stopTime + 0.5 * acceleration * stopTime * stopTime;

      return {
        time: clampedTime,
        position: Math.max(0, positionAtStop),
        velocity: 0,
        acceleration: 0,
        hasStopped: true,
        stopTime,
      };
    }

    const velocity = Math.max(0, initialVelocity + acceleration * clampedTime);
    const position = initialVelocity * clampedTime + 0.5 * acceleration * clampedTime * clampedTime;

    return {
      time: clampedTime,
      position: Math.max(0, position),
      velocity,
      acceleration,
      hasStopped: false,
      stopTime,
    };
  }

  const velocity = Math.max(0, initialVelocity + acceleration * clampedTime);
  const position = initialVelocity * clampedTime + 0.5 * acceleration * clampedTime * clampedTime;

  return {
    time: clampedTime,
    position: Math.max(0, position),
    velocity,
    acceleration,
    hasStopped: false,
    stopTime: null,
  };
}

function buildSecondMarkers({
  duration,
  initialVelocity,
  acceleration,
}: {
  duration: number;
  initialVelocity: number;
  acceleration: number;
}) {
  const maxWholeSecond = Math.floor(duration);
  const markers: MotionSample[] = [];

  for (let second = 1; second <= maxWholeSecond; second += 1) {
    markers.push(
      resolveMotionAtTime({
        time: second,
        duration,
        initialVelocity,
        acceleration,
      }),
    );
  }

  if (Math.abs(duration - maxWholeSecond) > 0.05) {
    markers.push(
      resolveMotionAtTime({
        time: duration,
        duration,
        initialVelocity,
        acceleration,
      }),
    );
  }

  return markers;
}

function buildGraphGeometry({
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
  series: MotionSample[];
  playedSeries: MotionSample[];
  width: number;
  height: number;
  x: number;
  y: number;
  duration: number;
  minValue: number;
  maxValue: number;
  mapValue: (sample: MotionSample) => number;
}) {
  const padding = { top: 48, right: 26, bottom: 34, left: 48 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const valueSpan = maxValue - minValue || 1;

  const mapTime = (time: number) => x + padding.left + (duration === 0 ? 0 : (time / duration) * plotWidth);
  const valueMapper = (value: number) => y + padding.top + (1 - (value - minValue) / valueSpan) * plotHeight;
  const pointToString = (sample: MotionSample) => `${mapTime(sample.time)},${valueMapper(mapValue(sample))}`;
  const fullPoints = series.map((sample) => ({
    x: mapTime(sample.time),
    y: valueMapper(mapValue(sample)),
  }));
  const fullPolyline = fullPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const playedPolyline = playedSeries.map(pointToString).join(" ");

  return {
    mapTime,
    mapValue: valueMapper,
    fullPolyline,
    playedPolyline,
    fullAreaPath: buildAreaPath({
      points: fullPoints,
      baselineY: y + padding.top + plotHeight,
    }),
  };
}

function buildAreaPath({
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
  const linePath = points.map((point) => `L ${point.x} ${point.y}`).join(" ");

  return `M ${firstPoint.x} ${baselineY} ${linePath} L ${lastPoint.x} ${baselineY} Z`;
}

function describeMotion({
  mode,
  currentTime,
  duration,
  isPlaying,
  currentMotion,
  initialVelocity,
  acceleration,
}: {
  mode: MotionMode;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  currentMotion: MotionSample;
  initialVelocity: number;
  acceleration: number;
}): MotionSummary {
  const isPaused = !isPlaying && currentTime > 0 && currentTime < duration && !currentMotion.hasStopped;

  if (mode === "uniform") {
    return {
      stateTone: currentTime === 0 || isPaused || currentTime >= duration ? "balanced" : "active",
      stateLabel:
        currentTime === 0 ? "待开始" : isPaused ? "已暂停" : currentTime >= duration ? "已完成" : "匀速中",
      observation: "同样过去 1 秒，轨道上的采样点间距基本一样，说明速度保持不变。",
      conclusion: "位移随时间均匀增加，s-t 图像是一条斜直线。",
      velocityFormula: `速度保持不变：v = ${formatNumber(initialVelocity, 1)} m/s`,
      displacementFormula: `位移公式：s = vt = ${formatNumber(initialVelocity, 1)} × t`,
    };
  }

  if (mode === "accelerating") {
    return {
      stateTone: currentTime === 0 || isPaused || currentTime >= duration ? "balanced" : "active",
      stateLabel:
        currentTime === 0 ? "待开始" : isPaused ? "已暂停" : currentTime >= duration ? "已完成" : "加速中",
      observation: "越往后的采样点越疏，表示相同时间内位移增加得更快。",
      conclusion: "速度一直在增大，所以位移曲线越来越陡。",
      velocityFormula: `速度公式：v = ${formatNumber(initialVelocity, 1)} + ${formatNumber(acceleration, 2)}t`,
      displacementFormula: `位移公式：s = ${formatNumber(initialVelocity, 1)}t + ${formatNumber(acceleration / 2, 2)}t²`,
    };
  }

  return {
    stateTone:
      currentTime === 0 || isPaused || currentMotion.hasStopped ? "balanced" : "warning",
    stateLabel:
      currentTime === 0
        ? "待开始"
        : isPaused
          ? "已暂停"
          : currentMotion.hasStopped
            ? "已刹停"
            : "减速中",
    observation: currentMotion.hasStopped
      ? "小车已经停止，后面的时间只会保持这个位移，不再继续前进。"
      : "采样点逐渐变密，说明相同时间内位移增长得越来越慢。",
    conclusion: currentMotion.hasStopped
      ? "速度减到 0 后，位移保持不变。"
      : "速度持续减小，所以位移曲线仍上升，但斜率在不断变小。",
    velocityFormula: `速度公式：v = ${formatNumber(initialVelocity, 1)} - ${formatNumber(Math.abs(acceleration), 2)}t`,
    displacementFormula: `位移公式：s = ${formatNumber(initialVelocity, 1)}t - ${formatNumber(Math.abs(acceleration) / 2, 2)}t²`,
  };
}

function formatNumber(value: number, digits = 1) {
  return Number(value.toFixed(digits)).toString();
}

function formatTimeLabel(value: number) {
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)}s`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
