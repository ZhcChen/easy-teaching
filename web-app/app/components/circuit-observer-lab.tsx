import { useEffect, useMemo, useState, type CSSProperties, type RefObject } from "react";

import { ControlButton } from "./control-button";
import { ControlChipGroup } from "./control-chip-group";
import { ControlPanelSection } from "./control-panel-section";
import { ControlRange } from "./control-range";
import { StatusPill } from "./status-pill";
import type { TeachingTopic } from "../data/teaching-catalog";
import { useLocale } from "../i18n";

type CircuitTopology = "series" | "parallel";
type CircuitFocusMode = "current" | "voltage" | "fault";
type Tone = "balanced" | "warning" | "active";

type CircuitObserverLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type CircuitMetrics = {
  totalVoltage: number;
  mainCurrent: number;
  totalResistance: number | null;
  l1Current: number | null;
  l2Current: number | null;
  l1Voltage: number | null;
  l2Voltage: number | null;
  l1Power: number;
  l2Power: number;
  l1Brightness: number;
  l2Brightness: number;
  l1Active: boolean;
  l2Active: boolean;
  hasCircuitFlow: boolean;
  stateLabel: string;
  stateTone: Tone;
  activeSegments: string[];
};

type CircuitExamplePreset = {
  sourceVoltage: number;
  l1Resistance: number;
  l2Resistance: number;
};

const CIRCUIT_STAGE = {
  width: 1360,
  height: 860,
  panelX: 72,
  panelY: 86,
  panelWidth: 1216,
  panelHeight: 654,
};

const SERIES_EXAMPLE: CircuitExamplePreset = {
  sourceVoltage: 6,
  l1Resistance: 12,
  l2Resistance: 8,
};

const PARALLEL_EXAMPLE: CircuitExamplePreset = {
  sourceVoltage: 6,
  l1Resistance: 15,
  l2Resistance: 30,
};

const CIRCUIT_PANEL_COLLAPSED_STORAGE_KEY = "easy-teaching.circuit-observer.panel-collapsed";

export function CircuitObserverLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: CircuitObserverLabProps) {
  const { isZh, tt } = useLocale();
  const [topology, setTopology] = useState<CircuitTopology>("series");
  const [focusMode, setFocusMode] = useState<CircuitFocusMode>("current");
  const [sourceVoltage, setSourceVoltage] = useState(SERIES_EXAMPLE.sourceVoltage);
  const [l1Resistance, setL1Resistance] = useState(SERIES_EXAMPLE.l1Resistance);
  const [l2Resistance, setL2Resistance] = useState(SERIES_EXAMPLE.l2Resistance);
  const [masterSwitchClosed, setMasterSwitchClosed] = useState(true);
  const [l1Enabled, setL1Enabled] = useState(true);
  const [l2Enabled, setL2Enabled] = useState(true);
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(
    readStoredCircuitPanelCollapsed,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      CIRCUIT_PANEL_COLLAPSED_STORAGE_KEY,
      isControlPanelCollapsed ? "1" : "0",
    );
  }, [isControlPanelCollapsed]);

  const metrics = useMemo(
    () =>
      buildCircuitMetrics({
        topology,
        sourceVoltage,
        l1Resistance,
        l2Resistance,
        masterSwitchClosed,
        l1Enabled,
        l2Enabled,
        isZh,
      }),
    [
      isZh,
      l1Enabled,
      l1Resistance,
      l2Enabled,
      l2Resistance,
      masterSwitchClosed,
      sourceVoltage,
      topology,
    ],
  );

  const formulaSummary = useMemo(
    () => buildFormulaSummary({ topology, focusMode, metrics, isZh }),
    [focusMode, isZh, metrics, topology],
  );

  const topologyLabel = topology === "series" ? tt("串联") : tt("并联");
  const focusLabel = getFocusLabel(focusMode, tt);
  const themeStyle = {
    "--circuit-accent": topology === "series" ? "#67c6ff" : "#8ea0ff",
    "--circuit-accent-soft":
      topology === "series" ? "rgba(103, 198, 255, 0.18)" : "rgba(142, 160, 255, 0.18)",
  } as CSSProperties;

  function applyTopologyExample(nextTopology: CircuitTopology) {
    const preset = nextTopology === "series" ? SERIES_EXAMPLE : PARALLEL_EXAMPLE;
    setTopology(nextTopology);
    setSourceVoltage(preset.sourceVoltage);
    setL1Resistance(preset.l1Resistance);
    setL2Resistance(preset.l2Resistance);
    setMasterSwitchClosed(true);
    setL1Enabled(true);
    setL2Enabled(true);
  }

  function applyCurrentTopologyExample() {
    applyTopologyExample(topology);
  }

  function resetDefaults() {
    setFocusMode("current");
    applyTopologyExample("series");
  }

  function clearFaults() {
    setMasterSwitchClosed(true);
    setL1Enabled(true);
    setL2Enabled(true);
  }

  return (
    <section
      ref={fullscreenRef}
      className="visual-shell force-lab-shell circuit-lab-shell"
      style={themeStyle}
    >
      <div
        className={
          isControlPanelCollapsed
            ? "force-lab-layout circuit-lab-layout is-collapsed"
            : "force-lab-layout circuit-lab-layout"
        }
      >
        <aside
          className={
            isControlPanelCollapsed
              ? "force-control-panel circuit-control-panel is-collapsed"
              : "force-control-panel circuit-control-panel"
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
                  <h4 className="force-control-title">{tt("控制面板")}</h4>
                  <p className="force-control-copy">
                    {tt("切换连接方式，观察电流、电压和亮灭变化。")}
                  </p>
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

              <div className="force-control-scroll circuit-control-scroll">
                <ControlPanelSection
                  title={tt("实验控制")}
                  hint={tt("先切换结构，再看规律差异")}
                  accent
                  className="circuit-panel-section"
                >
                  <ControlChipGroup
                    items={[
                      {
                        key: "series",
                        label: tt("串联"),
                        active: topology === "series",
                        title: tt("电流处处相等，电压按电阻分配。"),
                        onClick: () => setTopology("series"),
                      },
                      {
                        key: "parallel",
                        label: tt("并联"),
                        active: topology === "parallel",
                        title: tt("电压处处相等，电流按支路分配。"),
                        onClick: () => setTopology("parallel"),
                      },
                    ]}
                    columns={2}
                  />

                  <ControlChipGroup
                    items={[
                      {
                        key: "current",
                        label: tt("电流规律"),
                        active: focusMode === "current",
                        onClick: () => setFocusMode("current"),
                      },
                      {
                        key: "voltage",
                        label: tt("电压规律"),
                        active: focusMode === "voltage",
                        onClick: () => setFocusMode("voltage"),
                      },
                      {
                        key: "fault",
                        label: tt("故障对比"),
                        active: focusMode === "fault",
                        onClick: () => setFocusMode("fault"),
                      },
                    ]}
                    columns={3}
                    size="dense"
                  />

                  <div className="motion-action-row">
                    <ControlButton
                      variant="primary"
                      size="compact"
                      onClick={applyCurrentTopologyExample}
                    >
                      {tt("恢复示例")}
                    </ControlButton>
                    <ControlButton size="compact" onClick={resetDefaults}>
                      {tt("重置")}
                    </ControlButton>
                  </div>
                </ControlPanelSection>

                <ControlPanelSection
                  title={tt("电路参数")}
                  hint={tt("改变电源和灯泡规格")}
                  className="circuit-panel-section"
                >
                  <ControlRange
                    id="circuit-source-voltage"
                    label={tt("电源电压")}
                    unit="V"
                    min={1}
                    max={12}
                    step={0.5}
                    value={sourceVoltage}
                    editable
                    onChange={setSourceVoltage}
                  />

                  <ControlRange
                    id="circuit-l1-resistance"
                    label={tt("L1 电阻")}
                    unit="Ω"
                    min={2}
                    max={48}
                    step={1}
                    value={l1Resistance}
                    editable
                    onChange={setL1Resistance}
                  />

                  <ControlRange
                    id="circuit-l2-resistance"
                    label={tt("L2 电阻")}
                    unit="Ω"
                    min={2}
                    max={48}
                    step={1}
                    value={l2Resistance}
                    editable
                    onChange={setL2Resistance}
                  />
                </ControlPanelSection>

                <ControlPanelSection
                  title={tt("开关与故障")}
                  hint={tt("观察断开后的差异")}
                  className="circuit-panel-section"
                >
                  <ControlChipGroup
                    items={[
                      {
                        key: "switch-open",
                        label: tt("断开"),
                        active: !masterSwitchClosed,
                        onClick: () => setMasterSwitchClosed(false),
                      },
                      {
                        key: "switch-closed",
                        label: tt("闭合"),
                        active: masterSwitchClosed,
                        onClick: () => setMasterSwitchClosed(true),
                      },
                    ]}
                    columns={2}
                  />

                  <ControlChipGroup
                    items={[
                      {
                        key: "l1",
                        label: tt(l1Enabled ? "L1 正常" : "L1 断开"),
                        active: l1Enabled,
                        onClick: () => setL1Enabled((previous) => !previous),
                      },
                      {
                        key: "l2",
                        label: tt(l2Enabled ? "L2 正常" : "L2 断开"),
                        active: l2Enabled,
                        onClick: () => setL2Enabled((previous) => !previous),
                      },
                    ]}
                    columns={2}
                  />

                  <ControlButton variant="primary" size="compact" onClick={clearFaults}>
                    {tt("清除故障")}
                  </ControlButton>
                </ControlPanelSection>
              </div>
            </>
          )}
        </aside>

        <div className="force-lab-main circuit-lab-main">
          <div className="visual-canvas circuit-stage-canvas">
            <button
              type="button"
              onClick={() => {
                void onToggleFullscreen();
              }}
              className="fullscreen-button is-floating"
              aria-label={isFullscreen ? tt("退出全屏") : tt("进入全屏")}
              title={isFullscreen ? tt("退出全屏") : tt("进入全屏")}
            >
              {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
            </button>

            <div className="visual-grid-layer" />
            <div className="visual-glow visual-glow-a" />
            <div className="visual-glow visual-glow-b" />
            <div className="visual-line visual-line-a" />
            <div className="visual-line visual-line-b" />

            <div className="circuit-stage-hud is-top-left">
              <div className="circuit-stage-badges">
                <StatusPill>{topologyLabel}</StatusPill>
                <StatusPill>{focusLabel}</StatusPill>
                <StatusPill tone={metrics.stateTone}>{metrics.stateLabel}</StatusPill>
              </div>
              <p className="circuit-stage-note">{formulaSummary.summary}</p>
            </div>

            <div className="circuit-stage-hud is-top-right">
              <div className="circuit-stage-metric-grid">
                <MetricCard
                  label={tt("总电流")}
                  value={`${formatNumber(metrics.mainCurrent, 2)} A`}
                />
                <MetricCard
                  label={tt("总电压")}
                  value={`${formatNumber(metrics.totalVoltage, 1)} V`}
                />
                <MetricCard
                  label={tt("总电阻")}
                  value={
                    metrics.totalResistance === null
                      ? "—"
                      : `${formatNumber(metrics.totalResistance, 1)} Ω`
                  }
                />
              </div>
            </div>

            <div className="circuit-stage-hud is-bottom-edge">
              <div className="circuit-stage-info-dock">
                <div className="circuit-stage-formula-card">
                  <p className="circuit-stage-formula-kicker">{formulaSummary.kicker}</p>
                  <p className="circuit-stage-formula-main">{formulaSummary.expression}</p>
                  <p className="circuit-stage-formula-copy">{formulaSummary.detail}</p>
                </div>

                <div className="circuit-stage-bulb-grid">
                <BulbCard
                  title="L1"
                  resistance={l1Resistance}
                  current={metrics.l1Current}
                  voltage={metrics.l1Voltage}
                  brightness={metrics.l1Brightness}
                  active={metrics.l1Active}
                  tt={tt}
                />
                <BulbCard
                  title="L2"
                  resistance={l2Resistance}
                  current={metrics.l2Current}
                  voltage={metrics.l2Voltage}
                  brightness={metrics.l2Brightness}
                  active={metrics.l2Active}
                  tt={tt}
                />
                </div>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${CIRCUIT_STAGE.width} ${CIRCUIT_STAGE.height}`}
              className="circuit-stage-svg"
              role="img"
              aria-label={
                isZh
                  ? `${tt(topic.title)}可视化示意图`
                  : `${tt(topic.title)} visualization`
              }
            >
              <rect
                x={CIRCUIT_STAGE.panelX}
                y={CIRCUIT_STAGE.panelY}
                width={CIRCUIT_STAGE.panelWidth}
                height={CIRCUIT_STAGE.panelHeight}
                rx="32"
                className="motion-stage-panel-shell"
              />

              {topology === "series" ? (
                <SeriesCircuitScene
                  focusMode={focusMode}
                  metrics={metrics}
                  l1Resistance={l1Resistance}
                  l2Resistance={l2Resistance}
                  tt={tt}
                />
              ) : (
                <ParallelCircuitScene
                  focusMode={focusMode}
                  metrics={metrics}
                  l1Resistance={l1Resistance}
                  l2Resistance={l2Resistance}
                  tt={tt}
                />
              )}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

function SeriesCircuitScene({
  focusMode,
  metrics,
  l1Resistance,
  l2Resistance,
  tt,
}: {
  focusMode: CircuitFocusMode;
  metrics: CircuitMetrics;
  l1Resistance: number;
  l2Resistance: number;
  tt: (text: string) => string;
}) {
  return (
    <g>
      <text x="124" y="150" className="circuit-scene-title">
        {tt("串联结构")}
      </text>
      <text x="124" y="176" className="circuit-scene-copy">
        {tt("电流处处相等，电压按电阻大小分配。")}
      </text>

      <BatterySymbol x={188} topY={272} bottomY={530} label={tt("电源")} />

      <WirePath
        d="M 188 272 H 468"
        active={metrics.activeSegments.includes("series-left-top")}
        flowing={focusMode === "current" && metrics.hasCircuitFlow}
      />
      <SwitchSymbol
        x={514}
        y={272}
        closed={metrics.activeSegments.includes("series-switch")}
        label={tt("主开关")}
      />
      <WirePath
        d="M 560 272 H 716"
        active={metrics.activeSegments.includes("series-right-top")}
        flowing={focusMode === "current" && metrics.hasCircuitFlow}
      />

      <CircuitBulb
        cx={812}
        cy={272}
        label="L1"
        resistance={l1Resistance}
        brightness={metrics.l1Brightness}
        active={metrics.l1Active}
      />
      <WirePath
        d="M 872 272 H 988"
        active={metrics.activeSegments.includes("series-mid")}
        flowing={focusMode === "current" && metrics.hasCircuitFlow}
      />

      <CircuitBulb
        cx={1080}
        cy={272}
        label="L2"
        resistance={l2Resistance}
        brightness={metrics.l2Brightness}
        active={metrics.l2Active}
      />

      <WirePath
        d="M 1140 272 H 1204 V 530 H 188"
        active={metrics.activeSegments.includes("series-return")}
        flowing={focusMode === "current" && metrics.hasCircuitFlow}
      />

      {!metrics.l1Active ? <FaultMark x={812} y={272} /> : null}
      {!metrics.l2Active ? <FaultMark x={1080} y={272} /> : null}
    </g>
  );
}

function ParallelCircuitScene({
  focusMode,
  metrics,
  l1Resistance,
  l2Resistance,
  tt,
}: {
  focusMode: CircuitFocusMode;
  metrics: CircuitMetrics;
  l1Resistance: number;
  l2Resistance: number;
  tt: (text: string) => string;
}) {
  return (
    <g>
      <text x="124" y="150" className="circuit-scene-title">
        {tt("并联结构")}
      </text>
      <text x="124" y="176" className="circuit-scene-copy">
        {tt("各支路电压相等，干路电流等于各支路之和。")}
      </text>

      <BatterySymbol x={188} topY={248} bottomY={556} label={tt("电源")} />

      <WirePath
        d="M 188 248 H 468"
        active={metrics.activeSegments.includes("parallel-left-top")}
        flowing={focusMode === "current" && metrics.hasCircuitFlow}
      />
      <SwitchSymbol
        x={514}
        y={248}
        closed={metrics.activeSegments.includes("parallel-switch")}
        label={tt("主开关")}
      />
      <WirePath
        d="M 560 248 H 644 V 208"
        active={metrics.activeSegments.includes("parallel-left-rise")}
        flowing={focusMode === "current" && metrics.hasCircuitFlow}
      />
      <WirePath
        d="M 644 208 H 1148"
        active={metrics.activeSegments.includes("parallel-top-rail")}
        flowing={focusMode === "current" && metrics.hasCircuitFlow}
      />
      <WirePath
        d="M 644 208 V 542"
        active={metrics.activeSegments.includes("parallel-left-rail")}
        flowing={focusMode === "current" && metrics.hasCircuitFlow}
      />
      <WirePath
        d="M 644 542 H 1148"
        active={metrics.activeSegments.includes("parallel-bottom-rail")}
        flowing={focusMode === "current" && metrics.hasCircuitFlow}
      />
      <WirePath
        d="M 1148 208 V 542"
        active={metrics.activeSegments.includes("parallel-right-rail")}
        flowing={focusMode === "current" && metrics.hasCircuitFlow}
      />
      <WirePath
        d="M 1148 542 H 188"
        active={metrics.activeSegments.includes("parallel-return")}
        flowing={focusMode === "current" && metrics.hasCircuitFlow}
      />

      <JunctionNode x={644} y={208} active={metrics.hasCircuitFlow} />
      <JunctionNode x={644} y={542} active={metrics.hasCircuitFlow} />
      <JunctionNode x={1148} y={208} active={metrics.hasCircuitFlow} />
      <JunctionNode x={1148} y={542} active={metrics.hasCircuitFlow} />

      <WirePath
        d="M 644 286 H 722"
        active={metrics.activeSegments.includes("parallel-l1-left")}
        flowing={focusMode === "current" && metrics.l1Active}
      />
      <CircuitBulb
        cx={802}
        cy={286}
        label="L1"
        resistance={l1Resistance}
        brightness={metrics.l1Brightness}
        active={metrics.l1Active}
      />
      <WirePath
        d="M 862 286 H 1148"
        active={metrics.activeSegments.includes("parallel-l1-right")}
        flowing={focusMode === "current" && metrics.l1Active}
      />

      <WirePath
        d="M 644 446 H 722"
        active={metrics.activeSegments.includes("parallel-l2-left")}
        flowing={focusMode === "current" && metrics.l2Active}
      />
      <CircuitBulb
        cx={802}
        cy={446}
        label="L2"
        resistance={l2Resistance}
        brightness={metrics.l2Brightness}
        active={metrics.l2Active}
      />
      <WirePath
        d="M 862 446 H 1148"
        active={metrics.activeSegments.includes("parallel-l2-right")}
        flowing={focusMode === "current" && metrics.l2Active}
      />

      {!metrics.l1Active ? <FaultMark x={802} y={286} /> : null}
      {!metrics.l2Active ? <FaultMark x={802} y={446} /> : null}
    </g>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="circuit-stage-metric-card">
      <p className="circuit-stage-metric-label">{label}</p>
      <p className="circuit-stage-metric-value">{value}</p>
    </article>
  );
}

function BulbCard({
  title,
  resistance,
  current,
  voltage,
  brightness,
  active,
  tt,
}: {
  title: string;
  resistance: number;
  current: number | null;
  voltage: number | null;
  brightness: number;
  active: boolean;
  tt: (text: string) => string;
}) {
  return (
    <article className="circuit-stage-bulb-card">
      <div className="circuit-stage-bulb-head">
        <strong>{title}</strong>
        <StatusPill tone={active ? "active" : "warning"}>
          {active ? tt("导通") : tt("断开")}
        </StatusPill>
      </div>
      <div className="circuit-stage-bulb-row">
        <span>{tt("电阻")}</span>
        <strong>{formatNumber(resistance, 0)} Ω</strong>
      </div>
      <div className="circuit-stage-bulb-row">
        <span>{tt("电流")}</span>
        <strong>{current === null ? "—" : `${formatNumber(current, 2)} A`}</strong>
      </div>
      <div className="circuit-stage-bulb-row">
        <span>{tt("电压")}</span>
        <strong>{voltage === null ? "—" : `${formatNumber(voltage, 1)} V`}</strong>
      </div>
      <div className="circuit-stage-bulb-row">
        <span>{tt("亮度")}</span>
        <strong>{formatBrightness(brightness)}</strong>
      </div>
    </article>
  );
}

function CircuitBulb({
  cx,
  cy,
  label,
  resistance,
  brightness,
  active,
}: {
  cx: number;
  cy: number;
  label: string;
  resistance: number;
  brightness: number;
  active: boolean;
}) {
  const glowOpacity = active ? 0.14 + brightness * 0.42 : 0.05;
  const coreOpacity = active ? 0.28 + brightness * 0.56 : 0.12;
  const filamentOpacity = active ? 0.45 + brightness * 0.48 : 0.18;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r="64"
        className="circuit-bulb-glow"
        style={{ opacity: glowOpacity }}
      />
      <circle cx={cx} cy={cy} r="56" className="circuit-bulb-shell" />
      <circle
        cx={cx}
        cy={cy}
        r="44"
        className="circuit-bulb-core"
        style={{ opacity: coreOpacity }}
      />
      <path
        d={`M ${cx - 22} ${cy + 12} Q ${cx} ${cy - 20} ${cx + 22} ${cy + 12}`}
        className="circuit-bulb-filament"
        style={{ opacity: filamentOpacity }}
      />
      <line x1={cx - 30} y1={cy + 34} x2={cx - 14} y2={cy + 12} className="circuit-bulb-support" />
      <line x1={cx + 30} y1={cy + 34} x2={cx + 14} y2={cy + 12} className="circuit-bulb-support" />
      <text x={cx} y={cy - 80} textAnchor="middle" className="circuit-bulb-label">
        {label}
      </text>
      <text x={cx} y={cy + 102} textAnchor="middle" className="circuit-bulb-resistance">
        {formatNumber(resistance, 0)} Ω
      </text>
    </g>
  );
}

function BatterySymbol({
  x,
  topY,
  bottomY,
  label,
}: {
  x: number;
  topY: number;
  bottomY: number;
  label: string;
}) {
  return (
    <g>
      <line x1={x} y1={topY} x2={x} y2={bottomY} className="circuit-wire is-active" />
      <line x1={x - 18} y1={topY + 42} x2={x + 18} y2={topY + 42} className="circuit-battery-plate is-long" />
      <line x1={x - 10} y1={topY + 72} x2={x + 10} y2={topY + 72} className="circuit-battery-plate" />
      <text x={x + 32} y={topY + 50} className="circuit-battery-mark">
        +
      </text>
      <text x={x + 32} y={topY + 80} className="circuit-battery-mark">
        -
      </text>
      <text x={x - 10} y={bottomY + 42} className="circuit-device-label">
        {label}
      </text>
    </g>
  );
}

function SwitchSymbol({
  x,
  y,
  closed,
  label,
}: {
  x: number;
  y: number;
  closed: boolean;
  label: string;
}) {
  return (
    <g>
      <circle cx={x - 28} cy={y} r="6" className={closed ? "circuit-node is-active" : "circuit-node"} />
      <circle cx={x + 28} cy={y} r="6" className={closed ? "circuit-node is-active" : "circuit-node"} />
      {closed ? (
        <line x1={x - 24} y1={y} x2={x + 24} y2={y} className="circuit-wire is-active" />
      ) : (
        <line x1={x - 24} y1={y} x2={x + 12} y2={y - 24} className="circuit-switch-lever is-open" />
      )}
      <text x={x - 32} y={y - 28} className="circuit-device-label">
        {label}
      </text>
    </g>
  );
}

function WirePath({
  d,
  active,
  flowing,
}: {
  d: string;
  active: boolean;
  flowing?: boolean;
}) {
  const className = [
    "circuit-wire",
    active ? "is-active" : "",
    active && flowing ? "is-flowing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return <path d={d} className={className} />;
}

function JunctionNode({ x, y, active }: { x: number; y: number; active: boolean }) {
  return <circle cx={x} cy={y} r="7" className={active ? "circuit-node is-active" : "circuit-node"} />;
}

function FaultMark({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="68" className="circuit-fault-ring" />
      <path d={`M ${x - 32} ${y - 32} L ${x + 32} ${y + 32}`} className="circuit-fault-mark" />
      <path d={`M ${x + 32} ${y - 32} L ${x - 32} ${y + 32}`} className="circuit-fault-mark" />
    </g>
  );
}

function buildCircuitMetrics({
  topology,
  sourceVoltage,
  l1Resistance,
  l2Resistance,
  masterSwitchClosed,
  l1Enabled,
  l2Enabled,
  isZh,
}: {
  topology: CircuitTopology;
  sourceVoltage: number;
  l1Resistance: number;
  l2Resistance: number;
  masterSwitchClosed: boolean;
  l1Enabled: boolean;
  l2Enabled: boolean;
  isZh: boolean;
}): CircuitMetrics {
  const safeL1Resistance = Math.max(1, l1Resistance);
  const safeL2Resistance = Math.max(1, l2Resistance);

  if (topology === "series") {
    const hasCircuitFlow = masterSwitchClosed && l1Enabled && l2Enabled;
    const totalResistance = safeL1Resistance + safeL2Resistance;
    const mainCurrent = hasCircuitFlow ? sourceVoltage / totalResistance : 0;
    const l1Voltage = hasCircuitFlow ? mainCurrent * safeL1Resistance : null;
    const l2Voltage = hasCircuitFlow ? mainCurrent * safeL2Resistance : null;
    const l1Power = hasCircuitFlow ? mainCurrent * mainCurrent * safeL1Resistance : 0;
    const l2Power = hasCircuitFlow ? mainCurrent * mainCurrent * safeL2Resistance : 0;
    const brightnessBase = Math.max(l1Power, l2Power, 1);

    return {
      totalVoltage: sourceVoltage,
      mainCurrent,
      totalResistance: totalResistance,
      l1Current: hasCircuitFlow ? mainCurrent : null,
      l2Current: hasCircuitFlow ? mainCurrent : null,
      l1Voltage,
      l2Voltage,
      l1Power,
      l2Power,
      l1Brightness: hasCircuitFlow ? l1Power / brightnessBase : 0,
      l2Brightness: hasCircuitFlow ? l2Power / brightnessBase : 0,
      l1Active: hasCircuitFlow,
      l2Active: hasCircuitFlow,
      hasCircuitFlow,
      stateLabel: resolveStateLabel({
        topology,
        masterSwitchClosed,
        l1Enabled,
        l2Enabled,
        isZh,
      }),
      stateTone: resolveStateTone({ topology, masterSwitchClosed, l1Enabled, l2Enabled }),
      activeSegments: hasCircuitFlow
        ? ["series-left-top", "series-switch", "series-right-top", "series-mid", "series-return"]
        : [],
    };
  }

  const l1Active = masterSwitchClosed && l1Enabled;
  const l2Active = masterSwitchClosed && l2Enabled;
  const l1CurrentValue = l1Active ? sourceVoltage / safeL1Resistance : 0;
  const l2CurrentValue = l2Active ? sourceVoltage / safeL2Resistance : 0;
  const l1Power = l1Active ? (sourceVoltage * sourceVoltage) / safeL1Resistance : 0;
  const l2Power = l2Active ? (sourceVoltage * sourceVoltage) / safeL2Resistance : 0;
  const brightnessBase = Math.max(l1Power, l2Power, 1);
  const activeBranchCount = Number(l1Active) + Number(l2Active);

  let totalResistance: number | null = null;
  if (activeBranchCount === 2) {
    totalResistance = 1 / (1 / safeL1Resistance + 1 / safeL2Resistance);
  } else if (activeBranchCount === 1) {
    totalResistance = l1Active ? safeL1Resistance : safeL2Resistance;
  }

  return {
    totalVoltage: sourceVoltage,
    mainCurrent: l1CurrentValue + l2CurrentValue,
    totalResistance,
    l1Current: l1Active ? l1CurrentValue : null,
    l2Current: l2Active ? l2CurrentValue : null,
    l1Voltage: l1Active ? sourceVoltage : null,
    l2Voltage: l2Active ? sourceVoltage : null,
    l1Power,
    l2Power,
    l1Brightness: l1Active ? l1Power / brightnessBase : 0,
    l2Brightness: l2Active ? l2Power / brightnessBase : 0,
    l1Active,
    l2Active,
    hasCircuitFlow: masterSwitchClosed && (l1Active || l2Active),
    stateLabel: resolveStateLabel({
      topology,
      masterSwitchClosed,
      l1Enabled,
      l2Enabled,
      isZh,
    }),
    stateTone: resolveStateTone({ topology, masterSwitchClosed, l1Enabled, l2Enabled }),
    activeSegments: [
      ...(masterSwitchClosed ? ["parallel-left-top", "parallel-switch", "parallel-left-rise"] : []),
      ...((l1Active || l2Active) ? ["parallel-top-rail", "parallel-left-rail", "parallel-bottom-rail", "parallel-right-rail", "parallel-return"] : []),
      ...(l1Active ? ["parallel-l1-left", "parallel-l1-right"] : []),
      ...(l2Active ? ["parallel-l2-left", "parallel-l2-right"] : []),
    ],
  };
}

function buildFormulaSummary({
  topology,
  focusMode,
  metrics,
  isZh,
}: {
  topology: CircuitTopology;
  focusMode: CircuitFocusMode;
  metrics: CircuitMetrics;
  isZh: boolean;
}) {
  if (focusMode === "current") {
    if (topology === "series") {
      return {
        kicker: isZh ? "电流规律" : "Current pattern",
        expression: "I = I₁ = I₂",
        detail: isZh
          ? `当前主电流为 ${formatNumber(metrics.mainCurrent, 2)} A，整条回路中处处相等。`
          : `The current is ${formatNumber(metrics.mainCurrent, 2)} A and remains equal throughout the loop.`,
        summary: isZh
          ? "串联电路中，电流不会在灯泡之间分开。"
          : "In a series circuit, the current does not split between bulbs.",
      };
    }

    return {
      kicker: isZh ? "电流规律" : "Current pattern",
      expression: "I = I₁ + I₂",
      detail: isZh
        ? `当前干路电流 ${formatNumber(metrics.mainCurrent, 2)} A = ${formatMaybe(metrics.l1Current, 2, "A")} + ${formatMaybe(metrics.l2Current, 2, "A")}`
        : `The main current ${formatNumber(metrics.mainCurrent, 2)} A equals ${formatMaybe(metrics.l1Current, 2, "A")} + ${formatMaybe(metrics.l2Current, 2, "A")}.`,
      summary: isZh
        ? "并联时，电流会分到各个支路，再在干路重新汇合。"
        : "In parallel, current splits across branches and merges back into the main line.",
    };
  }

  if (focusMode === "voltage") {
    if (topology === "series") {
      return {
        kicker: isZh ? "电压规律" : "Voltage pattern",
        expression: "U = U₁ + U₂",
        detail: isZh
          ? `当前 ${formatMaybe(metrics.l1Voltage, 1, "V")} + ${formatMaybe(metrics.l2Voltage, 1, "V")} = ${formatNumber(metrics.totalVoltage, 1)} V`
          : `Currently ${formatMaybe(metrics.l1Voltage, 1, "V")} + ${formatMaybe(metrics.l2Voltage, 1, "V")} = ${formatNumber(metrics.totalVoltage, 1)} V.`,
        summary: isZh
          ? "串联中，电源电压会按灯泡电阻大小分给每个元件。"
          : "In a series circuit, the source voltage is shared across the bulbs.",
      };
    }

    return {
      kicker: isZh ? "电压规律" : "Voltage pattern",
      expression: "U = U₁ = U₂",
      detail: isZh
        ? `当前各支路两端都直接接到电源，因此都是 ${formatNumber(metrics.totalVoltage, 1)} V。`
        : `Each branch is directly connected across the source, so both stay at ${formatNumber(metrics.totalVoltage, 1)} V.`,
      summary: isZh
        ? "并联时，每条支路都拿到完整电源电压。"
        : "In parallel, every branch receives the full source voltage.",
    };
  }

  if (topology === "series") {
    return {
      kicker: isZh ? "故障对比" : "Fault comparison",
      expression: isZh ? "任一灯泡断开 -> 全回路熄灭" : "Any open bulb -> whole loop turns off",
      detail: isZh
        ? "串联只有一条通路，任何一点断开都会让电流变成 0。"
        : "A series circuit has only one path, so any break drives the current to 0.",
      summary: isZh
        ? "这是串联和并联最直观的区别之一。"
        : "This is one of the clearest contrasts between series and parallel circuits.",
    };
  }

  return {
    kicker: isZh ? "故障对比" : "Fault comparison",
    expression: isZh ? "单支路断开 -> 其余支路继续工作" : "One branch opens -> others keep working",
    detail: isZh
      ? "并联支路彼此独立，未断开的灯泡仍然有自己的闭合回路。"
      : "Parallel branches remain independent, so an intact branch still keeps its own closed path.",
    summary: isZh
      ? "并联更适合需要独立工作的多个用电器。"
      : "Parallel wiring fits appliances that need to work independently.",
  };
}

function resolveStateLabel({
  topology,
  masterSwitchClosed,
  l1Enabled,
  l2Enabled,
  isZh,
}: {
  topology: CircuitTopology;
  masterSwitchClosed: boolean;
  l1Enabled: boolean;
  l2Enabled: boolean;
  isZh: boolean;
}) {
  if (!masterSwitchClosed) {
    return isZh ? "主开关断开" : "Main switch open";
  }

  if (topology === "series") {
    if (!l1Enabled && !l2Enabled) {
      return isZh ? "串联双灯断开" : "Series bulbs open";
    }

    if (!l1Enabled || !l2Enabled) {
      return isZh ? "串联断路" : "Series circuit open";
    }

    return isZh ? "串联导通" : "Series energized";
  }

  if (!l1Enabled && !l2Enabled) {
    return isZh ? "全部支路断开" : "All branches open";
  }

  if (!l1Enabled || !l2Enabled) {
    return isZh ? "单支路工作" : "Single branch active";
  }

  return isZh ? "双支路导通" : "Both branches active";
}

function resolveStateTone({
  topology,
  masterSwitchClosed,
  l1Enabled,
  l2Enabled,
}: {
  topology: CircuitTopology;
  masterSwitchClosed: boolean;
  l1Enabled: boolean;
  l2Enabled: boolean;
}): Tone {
  if (!masterSwitchClosed) {
    return "warning";
  }

  if (topology === "series") {
    return l1Enabled && l2Enabled ? "active" : "warning";
  }

  if (!l1Enabled && !l2Enabled) {
    return "warning";
  }

  if (!l1Enabled || !l2Enabled) {
    return "balanced";
  }

  return "active";
}

function getFocusLabel(focusMode: CircuitFocusMode, tt: (text: string) => string) {
  if (focusMode === "voltage") {
    return tt("电压规律");
  }

  if (focusMode === "fault") {
    return tt("故障对比");
  }

  return tt("电流规律");
}

function readStoredCircuitPanelCollapsed() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(CIRCUIT_PANEL_COLLAPSED_STORAGE_KEY) === "1";
}

function formatNumber(value: number, digits: number) {
  return value.toFixed(digits).replace(/\.0+$|(\.\d*[1-9])0+$/, "$1");
}

function formatMaybe(value: number | null, digits: number, unit: string) {
  if (value === null) {
    return "—";
  }

  return `${formatNumber(value, digits)} ${unit}`;
}

function formatBrightness(value: number) {
  return `${Math.round(value * 100)}%`;
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
