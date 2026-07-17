import { useEffect, useMemo, useState, type RefObject } from "react";

import type { TeachingTopic } from "../data/teaching-catalog";

type Direction = "left" | "right";
type ForceKey = "gravity" | "normal" | "applied" | "friction" | "net";
type MotionState = "rest" | "threshold" | "sliding";
type Tone = "balanced" | "warning" | "active";

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

type ForceScene = {
  weight: number;
  normal: number;
  appliedSigned: number;
  frictionSigned: number;
  netForce: number;
  acceleration: number;
  staticLimit: number;
  kineticFriction: number;
  frictionModeLabel: string;
  stateLabel: string;
  stateTone: Tone;
  motionState: MotionState;
  directionLabel: string;
  directionSign: -1 | 1;
  isMoving: boolean;
  summary: string;
  motionHint: string;
};

const FORCE_COLORS: Record<ForceKey, string> = {
  gravity: "#ff6b6b",
  normal: "#34d399",
  applied: "#60a5fa",
  friction: "#f59e0b",
  net: "#c084fc",
};

const DEFAULT_VALUES = {
  mass: 3,
  gravity: 9.8,
  appliedForce: 18,
  direction: "right" as Direction,
  frictionEnabled: true,
  muStatic: 0.42,
  muKinetic: 0.28,
  showLabels: true,
  showValues: true,
  showNetForce: true,
  isPlaying: true,
};

export function BasicForceLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: BasicForceLabProps) {
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [mass, setMass] = useState(DEFAULT_VALUES.mass);
  const [gravity, setGravity] = useState(DEFAULT_VALUES.gravity);
  const [appliedForce, setAppliedForce] = useState(DEFAULT_VALUES.appliedForce);
  const [direction, setDirection] = useState<Direction>(DEFAULT_VALUES.direction);
  const [frictionEnabled, setFrictionEnabled] = useState(DEFAULT_VALUES.frictionEnabled);
  const [muStatic, setMuStatic] = useState(DEFAULT_VALUES.muStatic);
  const [muKinetic, setMuKinetic] = useState(DEFAULT_VALUES.muKinetic);
  const [showLabels, setShowLabels] = useState(DEFAULT_VALUES.showLabels);
  const [showValues, setShowValues] = useState(DEFAULT_VALUES.showValues);
  const [showNetForce, setShowNetForce] = useState(DEFAULT_VALUES.showNetForce);
  const [isPlaying, setIsPlaying] = useState(DEFAULT_VALUES.isPlaying);
  const [activeForce, setActiveForce] = useState<ForceKey>("applied");
  const [animationTick, setAnimationTick] = useState(0);

  const scene = useMemo(
    () =>
      computeBasicForceScene({
        mass,
        gravity,
        appliedForce,
        direction,
        frictionEnabled,
        muStatic,
        muKinetic,
      }),
    [appliedForce, direction, frictionEnabled, gravity, mass, muKinetic, muStatic],
  );

  useEffect(() => {
    if (!isPlaying || !scene.isMoving) {
      return;
    }

    const timerId = window.setInterval(() => {
      setAnimationTick((tick) => tick + 1);
    }, 48);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isPlaying, scene.isMoving]);

  const motionOffset =
    isPlaying && scene.isMoving
      ? scene.directionSign * (14 + Math.sin(animationTick / 3.4) * 16)
      : 0;

  const stage = useMemo(() => {
    const groundY = 388;
    const blockWidth = 150;
    const blockHeight = 92;
    const baseX = 330;
    const blockX = baseX + motionOffset;
    const blockY = groundY - blockHeight - 18;
    const centerX = blockX + blockWidth / 2;
    const centerY = blockY + blockHeight / 2;

    return {
      width: 920,
      height: 520,
      groundY,
      blockX,
      blockY,
      blockWidth,
      blockHeight,
      centerX,
      centerY,
    };
  }, [motionOffset]);

  const forceRows: ForceRow[] = [
    {
      key: "gravity",
      label: "重力 G",
      value: scene.weight,
      color: FORCE_COLORS.gravity,
      description: `重力由质量和重力加速度决定，G = m × g = ${formatNumber(mass, 1)} × ${formatNumber(gravity, 1)}。`,
    },
    {
      key: "normal",
      label: "支持力 N",
      value: scene.normal,
      color: FORCE_COLORS.normal,
      description: "当前是水平面模型，竖直方向平衡时支持力大小等于重力。",
    },
    {
      key: "applied",
      label: "外力 F",
      value: Math.abs(scene.appliedSigned),
      color: FORCE_COLORS.applied,
      description: `当前外力朝${scene.directionLabel}，先判断它是否能突破最大静摩擦。`,
    },
    {
      key: "friction",
      label: "摩擦力 f",
      value: Math.abs(scene.frictionSigned),
      color: FORCE_COLORS.friction,
      description: frictionEnabled
        ? `${scene.frictionModeLabel}：先比较外力和最大静摩擦，再判断是否进入滑动。`
        : "摩擦已关闭，当前水平面不再提供阻碍外力的反向作用。",
    },
    {
      key: "net",
      label: "合力 R",
      value: Math.abs(scene.netForce),
      color: FORCE_COLORS.net,
      description:
        Math.abs(scene.netForce) < 0.01
          ? "当前合力为 0，物体保持平衡。"
          : `当前合力朝${scene.netForce > 0 ? "右" : "左"}，对应加速度 ${formatNumber(Math.abs(scene.acceleration), 2)} m/s²。`,
    },
  ];

  const currentForce =
    forceRows.find((item) => item.key === activeForce) ?? forceRows[0];

  function resetDefaults() {
    setMass(DEFAULT_VALUES.mass);
    setGravity(DEFAULT_VALUES.gravity);
    setAppliedForce(DEFAULT_VALUES.appliedForce);
    setDirection(DEFAULT_VALUES.direction);
    setFrictionEnabled(DEFAULT_VALUES.frictionEnabled);
    setMuStatic(DEFAULT_VALUES.muStatic);
    setMuKinetic(DEFAULT_VALUES.muKinetic);
    setShowLabels(DEFAULT_VALUES.showLabels);
    setShowValues(DEFAULT_VALUES.showValues);
    setShowNetForce(DEFAULT_VALUES.showNetForce);
    setIsPlaying(DEFAULT_VALUES.isPlaying);
    setAnimationTick(0);
    setActiveForce("applied");
  }

  function updateStaticFriction(nextValue: number) {
    setMuStatic(nextValue);
    setMuKinetic((current) => Math.min(current, nextValue));
  }

  function updateKineticFriction(nextValue: number) {
    setMuKinetic(Math.min(nextValue, muStatic));
  }

  const horizontalMax = Math.max(
    Math.abs(scene.appliedSigned),
    Math.abs(scene.frictionSigned),
    Math.abs(scene.netForce),
    1,
  );
  const verticalMax = Math.max(scene.weight, scene.normal, 1);

  return (
    <section ref={fullscreenRef} className="visual-shell force-lab-shell">
      <div className="visual-shell-head">
        <div className="force-shell-heading">
          <p className="surface-eyebrow">参数联动演示</p>
          <h3 className="surface-title section-title-sm">{topic.title}</h3>
          <p className="force-shell-copy">
            左侧控制受力参数，右侧实时观察箭头方向、合力变化和运动趋势。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void onToggleFullscreen();
          }}
          className="fullscreen-button"
          aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
          title={isFullscreen ? "退出全屏" : "进入全屏"}
        >
          {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
        </button>
      </div>

      <div className={`force-lab-layout${panelCollapsed ? " is-collapsed" : ""}`}>
        <aside className="force-control-panel">
          <div className="force-control-header">
            {panelCollapsed ? (
              <div className="force-control-collapsed-title">
                <span>参数</span>
              </div>
            ) : (
              <div className="force-control-title-block">
                <p className="surface-eyebrow">参数控制面板</p>
                <h4 className="force-control-title">基础受力分析</h4>
                <p className="force-control-copy">
                  先看方向，再判断摩擦是否足够抵消外力。
                </p>
              </div>
            )}

            <button
              type="button"
              className="force-panel-toggle"
              onClick={() => setPanelCollapsed((current) => !current)}
              aria-label={panelCollapsed ? "展开参数面板" : "收起参数面板"}
              title={panelCollapsed ? "展开参数面板" : "收起参数面板"}
            >
              <PanelChevronIcon collapsed={panelCollapsed} />
            </button>
          </div>

          {panelCollapsed ? (
            <div className="force-panel-collapsed">
              <span className="force-mini-stat">m {formatNumber(mass, 1)} kg</span>
              <span className="force-mini-stat">F {formatNumber(appliedForce, 1)} N</span>
              <span className="force-mini-stat">μs {formatNumber(muStatic, 2)}</span>
              <span className="force-mini-stat">R {formatNumber(scene.netForce, 1)} N</span>
            </div>
          ) : (
            <>
              <section className="force-control-section">
                <div className="force-control-section-head">
                  <h5 className="force-control-section-title">基础参数</h5>
                  <span className="force-section-hint">研究对象与外力</span>
                </div>

                <RangeControl
                  id="force-mass"
                  label="物体质量"
                  unit="kg"
                  min={1}
                  max={8}
                  step={0.1}
                  value={mass}
                  onChange={setMass}
                />

                <RangeControl
                  id="force-gravity"
                  label="重力加速度"
                  unit="m/s²"
                  min={8}
                  max={12}
                  step={0.1}
                  value={gravity}
                  onChange={setGravity}
                />

                <RangeControl
                  id="force-applied"
                  label="外力大小"
                  unit="N"
                  min={0}
                  max={60}
                  step={0.5}
                  value={appliedForce}
                  onChange={setAppliedForce}
                />

                <div className="force-control-stack">
                  <div className="force-control-label-row">
                    <span className="force-control-label">外力方向</span>
                  </div>
                  <div className="force-segmented">
                    <button
                      type="button"
                      className={direction === "left" ? "force-segmented-button is-active" : "force-segmented-button"}
                      onClick={() => setDirection("left")}
                    >
                      向左
                    </button>
                    <button
                      type="button"
                      className={direction === "right" ? "force-segmented-button is-active" : "force-segmented-button"}
                      onClick={() => setDirection("right")}
                    >
                      向右
                    </button>
                  </div>
                </div>
              </section>

              <section className="force-control-section">
                <div className="force-control-section-head">
                  <h5 className="force-control-section-title">接触面参数</h5>
                  <span className="force-section-hint">静摩擦与动摩擦</span>
                </div>

                <ToggleControl
                  label="启用摩擦"
                  checked={frictionEnabled}
                  onChange={setFrictionEnabled}
                />

                <RangeControl
                  id="force-static-friction"
                  label="静摩擦系数 μs"
                  unit=""
                  min={0}
                  max={0.9}
                  step={0.01}
                  value={muStatic}
                  onChange={updateStaticFriction}
                  disabled={!frictionEnabled}
                />

                <RangeControl
                  id="force-kinetic-friction"
                  label="动摩擦系数 μk"
                  unit=""
                  min={0}
                  max={0.9}
                  step={0.01}
                  value={muKinetic}
                  onChange={updateKineticFriction}
                  disabled={!frictionEnabled}
                />
              </section>

              <section className="force-control-section">
                <div className="force-control-section-head">
                  <h5 className="force-control-section-title">显示与演示</h5>
                  <span className="force-section-hint">图层显示与动画</span>
                </div>

                <div className="force-toggle-list">
                  <ToggleControl
                    label="显示力名称"
                    checked={showLabels}
                    onChange={setShowLabels}
                  />
                  <ToggleControl
                    label="显示数值"
                    checked={showValues}
                    onChange={setShowValues}
                  />
                  <ToggleControl
                    label="显示合力"
                    checked={showNetForce}
                    onChange={setShowNetForce}
                  />
                </div>
              </section>
            </>
          )}
        </aside>

        <div className="force-lab-main">
          <div className="force-toolbar">
            <div className="force-toolbar-status">
              <span className={`force-state-pill is-${scene.stateTone}`}>
                {scene.stateLabel}
              </span>
              <span className="force-quick-pill">
                合力 {formatNumber(scene.netForce, 1)} N
              </span>
              <span className="force-quick-pill">
                a {formatNumber(scene.acceleration, 2)} m/s²
              </span>
            </div>

            <div className="force-toolbar-actions">
              <button
                type="button"
                className="force-ghost-button"
                onClick={() => setIsPlaying((current) => !current)}
              >
                {isPlaying ? "暂停动画" : "播放动画"}
              </button>
              <button type="button" className="force-ghost-button" onClick={resetDefaults}>
                恢复默认
              </button>
            </div>
          </div>

          <div className="force-highlight-row">
            {topic.highlights.map((item) => (
              <span key={item} className="force-highlight-chip">
                {item}
              </span>
            ))}
          </div>

          <div className="visual-canvas force-stage-canvas">
            <div className="visual-grid-layer" />
            <div className="visual-glow visual-glow-a" />
            <div className="visual-glow visual-glow-b" />

            <svg
              viewBox={`0 0 ${stage.width} ${stage.height}`}
              className="force-stage-svg"
              role="img"
              aria-label="基础受力分析可视化示意图"
            >
              <defs>
                <ArrowMarker id="force-arrow-gravity" color={FORCE_COLORS.gravity} />
                <ArrowMarker id="force-arrow-normal" color={FORCE_COLORS.normal} />
                <ArrowMarker id="force-arrow-applied" color={FORCE_COLORS.applied} />
                <ArrowMarker id="force-arrow-friction" color={FORCE_COLORS.friction} />
                <ArrowMarker id="force-arrow-net" color={FORCE_COLORS.net} />
              </defs>

              <line
                x1="32"
                y1={stage.groundY}
                x2={stage.width - 40}
                y2={stage.groundY}
                className="force-stage-ground"
              />
              <line
                x1="52"
                y1={stage.groundY + 44}
                x2="144"
                y2={stage.groundY + 44}
                className="force-stage-axis"
              />
              <text x="154" y={stage.groundY + 49} className="force-svg-caption">
                x 正方向
              </text>
              <text x="56" y={stage.groundY - 16} className="force-svg-caption">
                水平接触面
              </text>

              <ellipse
                cx={stage.centerX}
                cy={stage.groundY + 10}
                rx="120"
                ry="18"
                className="force-stage-shadow"
              />

              <g transform={`translate(${stage.blockX}, ${stage.blockY})`}>
                <rect
                  width={stage.blockWidth}
                  height={stage.blockHeight}
                  rx="22"
                  className="force-stage-block"
                />
                <rect
                  x="16"
                  y="16"
                  width={stage.blockWidth - 32}
                  height={stage.blockHeight - 32}
                  rx="16"
                  className="force-stage-block-inner"
                />
                <text
                  x={stage.blockWidth / 2}
                  y={stage.blockHeight / 2 - 6}
                  textAnchor="middle"
                  className="force-svg-title"
                >
                  研究对象
                </text>
                <text
                  x={stage.blockWidth / 2}
                  y={stage.blockHeight / 2 + 22}
                  textAnchor="middle"
                  className="force-svg-copy"
                >
                  m = {formatNumber(mass, 1)} kg
                </text>
              </g>

              <ForceVector
                id="force-arrow-gravity"
                color={FORCE_COLORS.gravity}
                label="G"
                magnitude={scene.weight}
                direction="down"
                anchorX={stage.centerX}
                anchorY={stage.centerY + 18}
                length={scaleArrow(scene.weight, verticalMax)}
                showLabels={showLabels}
                showValues={showValues}
                isActive={activeForce === "gravity"}
                onActivate={() => setActiveForce("gravity")}
                onDeactivate={() => setActiveForce("gravity")}
              />

              <ForceVector
                id="force-arrow-normal"
                color={FORCE_COLORS.normal}
                label="N"
                magnitude={scene.normal}
                direction="up"
                anchorX={stage.centerX}
                anchorY={stage.centerY - 18}
                length={scaleArrow(scene.normal, verticalMax)}
                showLabels={showLabels}
                showValues={showValues}
                isActive={activeForce === "normal"}
                onActivate={() => setActiveForce("normal")}
                onDeactivate={() => setActiveForce("normal")}
              />

              <ForceVector
                id="force-arrow-applied"
                color={FORCE_COLORS.applied}
                label="F"
                magnitude={Math.abs(scene.appliedSigned)}
                direction={scene.appliedSigned >= 0 ? "right" : "left"}
                anchorX={scene.appliedSigned >= 0 ? stage.blockX + stage.blockWidth : stage.blockX}
                anchorY={stage.centerY}
                length={scaleArrow(Math.abs(scene.appliedSigned), horizontalMax)}
                showLabels={showLabels}
                showValues={showValues}
                isActive={activeForce === "applied"}
                onActivate={() => setActiveForce("applied")}
                onDeactivate={() => setActiveForce("applied")}
              />

              <ForceVector
                id="force-arrow-friction"
                color={FORCE_COLORS.friction}
                label="f"
                magnitude={Math.abs(scene.frictionSigned)}
                direction={scene.frictionSigned >= 0 ? "right" : "left"}
                anchorX={scene.frictionSigned >= 0 ? stage.blockX + stage.blockWidth : stage.blockX}
                anchorY={stage.centerY + 48}
                length={scaleArrow(Math.abs(scene.frictionSigned), horizontalMax)}
                showLabels={showLabels}
                showValues={showValues}
                isActive={activeForce === "friction"}
                onActivate={() => setActiveForce("friction")}
                onDeactivate={() => setActiveForce("friction")}
              />

              {showNetForce ? (
                Math.abs(scene.netForce) < 0.01 ? (
                  <g className="force-balance-badge">
                    <rect
                      x={stage.centerX - 78}
                      y={stage.blockY - 76}
                      width="156"
                      height="34"
                      rx="17"
                    />
                    <text
                      x={stage.centerX}
                      y={stage.blockY - 54}
                      textAnchor="middle"
                      className="force-balance-copy"
                    >
                      合力 = 0，当前平衡
                    </text>
                  </g>
                ) : (
                  <ForceVector
                    id="force-arrow-net"
                    color={FORCE_COLORS.net}
                    label="R"
                    magnitude={Math.abs(scene.netForce)}
                    direction={scene.netForce >= 0 ? "right" : "left"}
                    anchorX={scene.netForce >= 0 ? stage.blockX + stage.blockWidth : stage.blockX}
                    anchorY={stage.blockY - 34}
                    length={scaleArrow(Math.abs(scene.netForce), horizontalMax)}
                    showLabels={showLabels}
                    showValues={showValues}
                    isActive={activeForce === "net"}
                    onActivate={() => setActiveForce("net")}
                    onDeactivate={() => setActiveForce("net")}
                  />
                )
              ) : null}
            </svg>
          </div>

          <div className="force-summary-grid">
            <article className="force-summary-card">
              <p className="force-summary-kicker">状态判断</p>
              <h4 className="force-summary-value">{scene.stateLabel}</h4>
              <p className="force-summary-copy">{scene.summary}</p>
            </article>

            <article className="force-summary-card">
              <p className="force-summary-kicker">摩擦判断</p>
              <h4 className="force-summary-value">
                {scene.frictionModeLabel}
              </h4>
              <p className="force-summary-copy">
                最大静摩擦 {formatNumber(scene.staticLimit, 1)} N，当前摩擦
                {formatNumber(Math.abs(scene.frictionSigned), 1)} N。
              </p>
            </article>

            <article className="force-summary-card">
              <p className="force-summary-kicker">合力结论</p>
              <h4 className="force-summary-value">
                {formatNumber(scene.netForce, 1)} N
              </h4>
              <p className="force-summary-copy">{scene.motionHint}</p>
            </article>

            <article className="force-summary-card">
              <p className="force-summary-kicker">公式速览</p>
              <h4 className="force-summary-value">R = F - f</h4>
              <p className="force-summary-copy">
                当前 a = R / m = {formatNumber(scene.acceleration, 2)} m/s²。
              </p>
            </article>

            <article className="force-summary-card is-wide">
              <p className="force-summary-kicker">力明细</p>
              <div className="force-legend-grid">
                {forceRows.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={item.key === activeForce ? "force-legend-item is-active" : "force-legend-item"}
                    onMouseEnter={() => setActiveForce(item.key)}
                    onFocus={() => setActiveForce(item.key)}
                    onClick={() => setActiveForce(item.key)}
                  >
                    <span
                      className="force-legend-swatch"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    <span className="force-legend-label">{item.label}</span>
                    <span className="force-legend-value">
                      {formatNumber(item.value, 1)} N
                    </span>
                  </button>
                ))}
              </div>
              <p className="force-summary-copy force-detail-copy">
                {currentForce.description}
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

type RangeControlProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  disabled?: boolean;
};

function RangeControl({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  disabled = false,
}: RangeControlProps) {
  return (
    <div className={disabled ? "force-control-stack is-disabled" : "force-control-stack"}>
      <div className="force-control-label-row">
        <label htmlFor={id} className="force-control-label">
          {label}
        </label>
        <span className="force-control-value">
          {formatNumber(value, step < 0.1 ? 2 : 1)}
          {unit ? ` ${unit}` : ""}
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
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
      />
    </div>
  );
}

type ToggleControlProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleControl({ label, checked, onChange }: ToggleControlProps) {
  return (
    <label className="force-toggle-row">
      <span className="force-toggle-copy">{label}</span>
      <input
        className="force-toggle-input"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
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
  showLabels: boolean;
  showValues: boolean;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
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
  showLabels,
  showValues,
  isActive,
  onActivate,
  onDeactivate,
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

  const caption =
    showLabels || showValues
      ? `${showLabels ? label : ""}${showLabels && showValues ? " " : ""}${showValues ? `${formatNumber(magnitude, 1)}N` : ""}`
      : "";

  const captionMetrics = getLabelMetrics(direction, anchorX, anchorY, endX, endY, caption);

  return (
    <g
      className={isActive ? "force-vector is-active" : "force-vector"}
      onMouseEnter={onActivate}
      onMouseLeave={onDeactivate}
      onFocus={onActivate}
      onBlur={onDeactivate}
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
      {caption ? (
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
      ) : null}
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

function computeBasicForceScene({
  mass,
  gravity,
  appliedForce,
  direction,
  frictionEnabled,
  muStatic,
  muKinetic,
}: {
  mass: number;
  gravity: number;
  appliedForce: number;
  direction: Direction;
  frictionEnabled: boolean;
  muStatic: number;
  muKinetic: number;
}): ForceScene {
  const directionSign = direction === "right" ? 1 : -1;
  const directionLabel = direction === "right" ? "右" : "左";
  const weight = mass * gravity;
  const normal = weight;
  const appliedSigned = appliedForce * directionSign;
  const staticLimit = frictionEnabled ? muStatic * normal : 0;
  const kineticFriction = frictionEnabled ? muKinetic * normal : 0;

  let frictionSigned = 0;
  let netForce = appliedSigned;
  let frictionModeLabel = frictionEnabled ? "静摩擦待命" : "未启用摩擦";
  let stateLabel = "静止平衡";
  let stateTone: Tone = "balanced";
  let motionState: MotionState = "rest";
  let summary = "当前没有水平合力，物体保持静止。";
  let motionHint = "先确定研究对象，再逐个判断水平和竖直方向是否平衡。";

  if (!frictionEnabled) {
    if (appliedForce > 0) {
      stateLabel = "无摩擦加速";
      stateTone = "active";
      motionState = "sliding";
      summary = "摩擦关闭后，外力直接转化为合力，物体会向外力方向加速。";
      motionHint = `当前合力朝${directionLabel}，物体向${directionLabel}加速。`;
    }
  } else if (appliedForce === 0) {
    netForce = 0;
    frictionModeLabel = "静摩擦待命";
    summary = "没有水平外力时，不需要摩擦力参与平衡。";
    motionHint = "现在只有重力和支持力，竖直方向平衡。";
  } else if (appliedForce < staticLimit * 0.92) {
    frictionSigned = -appliedSigned;
    netForce = 0;
    frictionModeLabel = "静摩擦平衡";
    summary = "静摩擦力与外力等大反向，水平方向合力为 0。";
    motionHint = "物体虽然受推拉，但仍保持静止。";
  } else if (appliedForce <= staticLimit) {
    frictionSigned = -appliedSigned;
    netForce = 0;
    frictionModeLabel = "临界静摩擦";
    stateLabel = "即将滑动";
    stateTone = "warning";
    motionState = "threshold";
    summary = "外力已经接近最大静摩擦，再增大一点就会开始滑动。";
    motionHint = `这是临界状态，继续增大外力将向${directionLabel}滑动。`;
  } else {
    frictionSigned = -directionSign * kineticFriction;
    netForce = appliedSigned + frictionSigned;
    frictionModeLabel = "动摩擦";
    stateLabel = "已开始滑动";
    stateTone = "active";
    motionState = "sliding";
    summary = "外力已经超过最大静摩擦，物体开始滑动，摩擦变成动摩擦。";
    motionHint = `当前合力朝${netForce > 0 ? "右" : "左"}，物体继续加速滑动。`;
  }

  const acceleration = netForce / mass;

  return {
    weight,
    normal,
    appliedSigned,
    frictionSigned,
    netForce,
    acceleration,
    staticLimit,
    kineticFriction,
    frictionModeLabel,
    stateLabel,
    stateTone,
    motionState,
    directionLabel,
    directionSign: directionSign as -1 | 1,
    isMoving: motionState === "sliding" && Math.abs(netForce) > 0.01,
    summary,
    motionHint,
  };
}

function scaleArrow(magnitude: number, maxMagnitude: number) {
  if (magnitude <= 0) {
    return 0;
  }

  return 52 + (magnitude / maxMagnitude) * 78;
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
