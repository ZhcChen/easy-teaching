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

type OhmsLawLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type StudyMode = "iu" | "ir";
type ObservationState = "idle" | "observing" | "stable";
type TimerId = ReturnType<typeof setInterval>;

type ModePreset = {
  key: StudyMode;
  stepLabel: string;
  label: string;
  summary: string;
  focus: string;
  fixedCopy: string;
  graphTitle: string;
  graphNote: string;
};

type LawRecord = {
  key: string;
  value: string;
  note: string;
};

type RecordBuckets = {
  iu: Record<string, LawRecord>;
  ir: Record<string, LawRecord>;
};

type LawMetrics = {
  targetVoltage: number;
  targetResistance: number;
  targetCurrent: number;
  displayedVoltage: number;
  displayedResistance: number;
  displayedCurrent: number;
  ratioUI: number | null;
  productIR: number | null;
};

type GraphPoint = {
  xValue: number;
  yValue: number;
};

type GraphGeometry = {
  chartTop: number;
  chartBottom: number;
  fullPolyline: string;
  focusPolyline: string;
  currentPoint: {
    x: number;
    y: number;
  };
  recordedPoints: Array<{
    key: string;
    x: number;
    y: number;
    label: string;
  }>;
  yTicks: Array<{
    key: string;
    x1: number;
    x2: number;
    y: number;
    labelX: number;
    label: string;
  }>;
  xTicks: Array<{
    key: string;
    x: number;
    y1: number;
    y2: number;
    labelY: number;
    label: string;
  }>;
};

const PANEL_COLLAPSED_STORAGE_KEY = "easy-teaching.ohms-law.panel-collapsed";
const OBSERVATION_TICK_MS = 40;
const OBSERVATION_DURATION_MS = 1080;
const VOLTAGE_SEQUENCE = [2, 4, 6, 8] as const;
const RESISTANCE_SEQUENCE = [5, 10, 15, 20] as const;
const FIXED_RESISTANCE_OHM = 10;
const FIXED_VOLTAGE_V = 6;

const MODE_PRESETS: Record<StudyMode, ModePreset> = {
  iu: {
    key: "iu",
    stepLabel: "1",
    label: "R 一定：I-U",
    summary: "保持定值电阻不变，依次改变电压，观察电流与电压是否成正比。",
    focus: "电阻一定时，电流与电压成正比，I-U 图像是一条过原点的直线。",
    fixedCopy: "保持 R = 10 Ω 不变",
    graphTitle: "电流 - 电压",
    graphNote: "（电阻一定时，I-U 图像应为过原点的直线。）",
  },
  ir: {
    key: "ir",
    stepLabel: "2",
    label: "U 一定：I-R",
    summary: "保持电压不变，依次更换电阻，观察电流与电阻是否成反比。",
    focus: "电压一定时，电流随电阻增大而减小，I-R 图像是一条反比例曲线。",
    fixedCopy: "保持 U = 6 V 不变",
    graphTitle: "电流 - 电阻",
    graphNote: "（电压一定时，I-R 图像应为下降的反比例曲线。）",
  },
};

const SVG_STAGE = {
  width: 1160,
  height: 760,
  circuitPanelX: 60,
  circuitPanelY: 78,
  circuitPanelWidth: 1040,
  circuitPanelHeight: 262,
  graphPanelX: 60,
  graphPanelY: 364,
  graphPanelWidth: 1040,
  graphPanelHeight: 284,
  wireLeftX: 184,
  wireRightX: 972,
  wireTopY: 176,
  wireBottomY: 308,
  resistorCenterX: 566,
  resistorY: 176,
  resistorWidth: 150,
  voltmeterCenterX: 748,
  voltmeterCenterY: 242,
  ammeterCenterX: 470,
  ammeterCenterY: 308,
  batteryX: 186,
  batteryTopY: 210,
  batteryBottomY: 276,
  switchLeftX: 248,
  switchY: 308,
  rheostatX: 812,
  rheostatY: 308,
};

export function OhmsLawLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: OhmsLawLabProps) {
  const { isZh, tt } = useLocale();
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  const [mode, setMode] = useState<StudyMode>("iu");
  const [voltageValue, setVoltageValue] = useState<number>(VOLTAGE_SEQUENCE[0]);
  const [resistanceValue, setResistanceValue] = useState<number>(RESISTANCE_SEQUENCE[0]);
  const [observationState, setObservationState] = useState<ObservationState>("idle");
  const [progress, setProgress] = useState(0);
  const [records, setRecords] = useState<RecordBuckets>({
    iu: {},
    ir: {},
  });
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

  const activePreset = MODE_PRESETS[mode];
  const currentSequence = mode === "iu" ? VOLTAGE_SEQUENCE : RESISTANCE_SEQUENCE;
  const currentVariableValue = mode === "iu" ? voltageValue : resistanceValue;
  const currentGroupKey = buildGroupKey(mode, currentVariableValue);
  const currentGroupRecorded = Boolean(records[mode][currentGroupKey]);
  const displayProgress = observationState === "idle" ? 0 : observationState === "stable" ? 1 : progress;
  const metrics = useMemo(
    () => buildLawMetrics({ mode, voltageValue, resistanceValue, displayProgress }),
    [displayProgress, mode, resistanceValue, voltageValue],
  );

  const stageMeta = useMemo(() => {
    const copy = describeObservation({
      mode,
      metrics,
      isZh,
    });

    if (observationState === "stable") {
      return {
        label: isZh ? "读数稳定" : "Stable reading",
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
  }, [activePreset.summary, isZh, metrics, mode, observationState]);

  const modeItems = [
    {
      key: "iu",
      stepLabel: MODE_PRESETS.iu.stepLabel,
      label: tt(MODE_PRESETS.iu.label),
      active: mode === "iu",
      title: tt(MODE_PRESETS.iu.summary),
      onClick: () => applyMode("iu"),
    },
    {
      key: "ir",
      stepLabel: MODE_PRESETS.ir.stepLabel,
      label: tt(MODE_PRESETS.ir.label),
      active: mode === "ir",
      title: tt(MODE_PRESETS.ir.summary),
      onClick: () => applyMode("ir"),
    },
  ];

  const recordGroups = useMemo(
    () => buildRecordGroups({ records, currentMode: mode, currentValue: currentVariableValue, isZh }),
    [currentVariableValue, isZh, mode, records],
  );

  const totalRecordedCount = Object.keys(records.iu).length + Object.keys(records.ir).length;
  const isRecordEnabled = observationState === "stable";

  const graphSeries = useMemo(
    () => buildFullSeries(mode),
    [mode],
  );
  const graphGeometry = useMemo(
    () =>
      buildGraphGeometry({
        mode,
        currentXValue: currentVariableValue,
        currentYValue: metrics.displayedCurrent,
        recordedPoints: buildRecordedGraphPoints(mode, records),
        series: graphSeries,
        x: SVG_STAGE.graphPanelX,
        y: SVG_STAGE.graphPanelY,
        width: SVG_STAGE.graphPanelWidth,
        height: SVG_STAGE.graphPanelHeight,
      }),
    [currentVariableValue, graphSeries, metrics.displayedCurrent, mode, records],
  );

  const comparisonRows = useMemo(
    () => buildComparisonRows({ mode, records, isZh, currentValue: currentVariableValue }),
    [currentVariableValue, isZh, mode, records],
  );

  const meterNeedles = useMemo(() => {
    const currentRatio = Math.max(0, Math.min(1, metrics.displayedCurrent / 1.2));
    const voltageRatio = Math.max(0, Math.min(1, metrics.displayedVoltage / 8));
    return {
      ammeter: describeNeedle(SVG_STAGE.ammeterCenterX, SVG_STAGE.ammeterCenterY, 26, currentRatio),
      voltmeter: describeNeedle(SVG_STAGE.voltmeterCenterX, SVG_STAGE.voltmeterCenterY, 26, voltageRatio),
    };
  }, [metrics.displayedCurrent, metrics.displayedVoltage]);

  const summaryItems = [
    {
      label: isZh ? "当前研究变量" : "Studied variable",
      value: mode === "iu"
        ? `${formatVoltage(voltageValue)} · ${tt("电压")}`
        : `${formatResistance(resistanceValue)} · ${tt("电阻")}`,
    },
    {
      label: isZh ? "课堂判断" : "Current takeaway",
      value: tt(activePreset.focus),
    },
  ];

  const primaryActionLabel = observationState === "observing"
    ? (isZh ? "观察中…" : "Observing…")
    : observationState === "stable"
      ? (isZh ? "重新观察" : "Replay")
      : (isZh ? "开始观察" : "Start");
  const recordButtonLabel = currentGroupRecorded
    ? (isZh ? "更新本组" : "Update current run")
    : (isZh ? "记录本组" : "Record current run");

  return (
    <section ref={fullscreenRef} className="visual-shell force-lab-shell ohms-lab-shell">
      <div
        className={
          isControlPanelCollapsed
            ? "force-lab-layout ohms-lab-layout is-collapsed"
            : "force-lab-layout ohms-lab-layout"
        }
      >
        <aside
          className={
            isControlPanelCollapsed
              ? "force-control-panel ohms-control-panel is-collapsed"
              : "force-control-panel ohms-control-panel"
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

              <div className="force-control-scroll ohms-control-scroll">
                <ControlPanelSection
                  title={isZh ? "课堂主流程" : "Classroom Flow"}
                  hint={isZh ? "先锁定一个量，再看图像和数据关系" : "Lock one variable, then read the graph and data"}
                  accent
                >
                  <ControlStatusBar
                    items={[
                      <StatusPill key="mode">{tt(activePreset.label)}</StatusPill>,
                      <StatusPill key="record">{isZh ? `${totalRecordedCount} / 8 已记录` : `${totalRecordedCount} / 8 recorded`}</StatusPill>,
                    ]}
                    status={<StatusPill tone={stageMeta.tone}>{stageMeta.label}</StatusPill>}
                  />
                  <p className="force-inline-copy">{tt(activePreset.summary)}</p>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "实验模式" : "Experiment Mode"}
                  hint={isZh ? "切换模式时会保留旧记录，但当前读数需要重新观察" : "Switching modes keeps old records but resets the current reading"}
                >
                  <ControlChipGroup
                    items={[
                      {
                        key: "iu",
                        label: tt(MODE_PRESETS.iu.label),
                        active: mode === "iu",
                        onClick: () => applyMode("iu"),
                      },
                      {
                        key: "ir",
                        label: tt(MODE_PRESETS.ir.label),
                        active: mode === "ir",
                        onClick: () => applyMode("ir"),
                      },
                    ]}
                    columns={2}
                    size="dense"
                  />

                  <div className="pressure-inline-lock-grid">
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "锁定条件" : "Locked condition"}</span>
                      <strong className="force-insight-value">{tt(activePreset.fixedCopy)}</strong>
                    </article>
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "计算公式" : "Formula"}</span>
                      <strong className="force-insight-value">I = U / R</strong>
                    </article>
                  </div>

                  <p className="force-inline-copy">{tt(activePreset.focus)}</p>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "当前组次" : "Current Run"}
                  hint={isZh ? "课堂记录使用 4 组标准数据，便于直接验证比例关系" : "Use the four standard values to verify the relationship directly"}
                >
                  <ControlChipGroup
                    items={currentSequence.map((value) => ({
                      key: `${value}`,
                      label: mode === "iu" ? `${value} V` : `${value} Ω`,
                      active: currentVariableValue === value,
                      onClick: () => {
                        if (mode === "iu") {
                          setVoltageValue(value);
                        } else {
                          setResistanceValue(value);
                        }
                        invalidateObservation();
                      },
                    }))}
                    columns={2}
                    size="dense"
                  />

                  {mode === "iu" ? (
                    <ControlRange
                      id="ohms-voltage"
                      label={isZh ? "电压 U" : "Voltage U"}
                      min={VOLTAGE_SEQUENCE[0]}
                      max={VOLTAGE_SEQUENCE[VOLTAGE_SEQUENCE.length - 1]}
                      step={2}
                      unit="V"
                      value={voltageValue}
                      editable
                      onChange={(value) => {
                        setVoltageValue(value);
                        invalidateObservation();
                      }}
                    />
                  ) : (
                    <ControlRange
                      id="ohms-resistance"
                      label={isZh ? "电阻 R" : "Resistance R"}
                      min={RESISTANCE_SEQUENCE[0]}
                      max={RESISTANCE_SEQUENCE[RESISTANCE_SEQUENCE.length - 1]}
                      step={5}
                      unit="Ω"
                      value={resistanceValue}
                      editable
                      onChange={(value) => {
                        setResistanceValue(value);
                        invalidateObservation();
                      }}
                    />
                  )}

                  <div className="pressure-inline-lock-grid">
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "目标电流 I" : "Target current I"}</span>
                      <strong className="force-insight-value">{formatCurrent(metrics.targetCurrent)}</strong>
                    </article>
                    <article className="force-insight-card">
                      <span className="force-insight-label">{mode === "iu" ? (isZh ? "U / I" : "U / I") : (isZh ? "I × R" : "I × R")}</span>
                      <strong className="force-insight-value">
                        {mode === "iu"
                          ? `${formatResistance(metrics.targetResistance)}`
                          : `${formatVoltage(metrics.targetVoltage)}`}
                      </strong>
                    </article>
                  </div>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "操作与记录" : "Observe & Record"}
                  hint={isZh ? "读数稳定后再记录本组，然后自动切到下一组" : "Record after the meters settle, then continue to the next run"}
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
                    emptyTitle={isZh ? "先完成第一组测量" : "Finish the first measurement"}
                    emptyCopy={
                      isZh
                        ? "记录单会分别保留 I-U 与 I-R 两组实验数据，便于最后统一归纳欧姆定律。"
                        : "The worksheet keeps both I-U and I-R runs for the final Ohm's law conclusion."
                    }
                    pendingCopy={isZh ? "待测" : "Pending"}
                  />
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "思考提示" : "Think Prompt"}
                  hint={isZh ? "帮助区分测量公式与物理规律" : "Separate the measured formula from the physical law"}
                >
                  <ul className="force-support-question-list">
                    <li>{isZh ? "为什么研究 I-U 关系时必须保持电阻不变？" : "Why must the resistance stay fixed when studying I-U?"}</li>
                    <li>{isZh ? "为什么研究 I-R 关系时，更换电阻后还要调节滑动变阻器？" : "Why must the rheostat be adjusted again after changing the resistor?"}</li>
                    <li>{isZh ? "R = U / I 能否说明电阻会随电压或电流变化？" : "Does R = U / I mean resistance changes with voltage or current?"}</li>
                  </ul>
                </ControlPanelSection>
              </div>
            </>
          )}
        </aside>

        <div className="force-lab-main ohms-lab-main">
          <div className="force-toolbar">
            <div className="force-toolbar-status">
              <StatusPill tone="active">{tt("欧姆定律")}</StatusPill>
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

          <div className="visual-canvas motion-stage-canvas ohms-stage-canvas">
            <ControlStepGroup
              className="force-stage-overlay is-top-center force-stage-stepbar ohms-stage-stepbar"
              items={modeItems}
            />
            <div className="visual-grid-layer" />
            <div className="visual-glow visual-glow-a" />
            <div className="visual-glow visual-glow-b" />
            <div className="visual-line visual-line-a" />
            <div className="visual-line visual-line-b" />

            <div className="force-stage-overlay is-top-left">
              <div className="force-stage-hud-card">
                <div className="force-stage-hud-head">
                  <span className="force-stage-hud-title">{tt(activePreset.label)}</span>
                  <StatusPill tone={stageMeta.tone}>{stageMeta.label}</StatusPill>
                </div>
                <p className="pressure-stage-copy">{tt(stageMeta.copy)}</p>
                <div className="force-stage-progress-inline">
                  <span style={{ width: `${Math.max(0, Math.min(100, displayProgress * 100))}%` }} />
                </div>
                <div className="force-stage-chip-grid">
                  <span className="force-stage-chip">{tt(activePreset.fixedCopy)}</span>
                  <span className="force-stage-chip">{mode === "iu" ? `U = ${formatVoltage(voltageValue)}` : `R = ${formatResistance(resistanceValue)}`}</span>
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
                    <strong>{formatVoltage(metrics.displayedVoltage)}</strong>
                    <span>{isZh ? "电压 U" : "Voltage U"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{formatCurrent(metrics.displayedCurrent)}</strong>
                    <span>{isZh ? "电流 I" : "Current I"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{formatResistance(metrics.displayedResistance)}</strong>
                    <span>{isZh ? "电阻 R" : "Resistance R"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>
                      {mode === "iu"
                        ? `${formatResistance(metrics.ratioUI ?? metrics.targetResistance)}`
                        : `${formatVoltage(metrics.productIR ?? metrics.targetVoltage)}`}
                    </strong>
                    <span>{mode === "iu" ? "U / I" : "I × R"}</span>
                  </article>
                </div>
              </div>
            </div>

            <div className="force-stage-overlay is-bottom-right">
              <div className="force-stage-hud-card is-tight pressure-stage-comparison-card">
                <div className="force-stage-hud-head">
                  <span className="force-stage-hud-title">{isZh ? "电流对照" : "Current Comparison"}</span>
                  <span className="force-stage-chip">{mode === "iu" ? `${Object.keys(records.iu).length} / 4` : `${Object.keys(records.ir).length} / 4`}</span>
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
            </div>

            <svg
              viewBox={`0 0 ${SVG_STAGE.width} ${SVG_STAGE.height}`}
              className="motion-stage-svg ohms-stage-svg"
              role="img"
              aria-label={isZh ? `${tt(topic.title)}可视化示意图` : `${tt(topic.title)} visualization`}
            >
              <rect
                x={SVG_STAGE.circuitPanelX}
                y={SVG_STAGE.circuitPanelY}
                width={SVG_STAGE.circuitPanelWidth}
                height={SVG_STAGE.circuitPanelHeight}
                rx="34"
                className="motion-stage-panel-shell"
              />
              <text x={SVG_STAGE.circuitPanelX + 34} y={SVG_STAGE.circuitPanelY + 30} className="motion-stage-panel-title">
                {tt("伏安法观察电路")}
              </text>
              <text x={SVG_STAGE.circuitPanelX + 34} y={SVG_STAGE.circuitPanelY + 54} className="motion-stage-panel-copy">
                {tt("通过电源、电流表、电压表、定值电阻和滑动变阻器，观察 I、U、R 的定量关系。")}
              </text>

              <g className="ohms-stage-circuit">
                <path
                  d={`M ${SVG_STAGE.wireLeftX} ${SVG_STAGE.wireTopY} L ${SVG_STAGE.resistorCenterX - 110} ${SVG_STAGE.wireTopY}
                    M ${SVG_STAGE.resistorCenterX + 110} ${SVG_STAGE.wireTopY} L ${SVG_STAGE.wireRightX} ${SVG_STAGE.wireTopY}
                    M ${SVG_STAGE.wireRightX} ${SVG_STAGE.wireTopY} L ${SVG_STAGE.wireRightX} ${SVG_STAGE.wireBottomY}
                    M ${SVG_STAGE.wireRightX} ${SVG_STAGE.wireBottomY} L ${SVG_STAGE.rheostatX + 88} ${SVG_STAGE.wireBottomY}
                    M ${SVG_STAGE.rheostatX - 88} ${SVG_STAGE.wireBottomY} L ${SVG_STAGE.ammeterCenterX + 42} ${SVG_STAGE.wireBottomY}
                    M ${SVG_STAGE.ammeterCenterX - 42} ${SVG_STAGE.wireBottomY} L ${SVG_STAGE.switchLeftX + 74} ${SVG_STAGE.wireBottomY}
                    M ${SVG_STAGE.switchLeftX - 54} ${SVG_STAGE.wireBottomY} L ${SVG_STAGE.wireLeftX} ${SVG_STAGE.wireBottomY}
                    M ${SVG_STAGE.wireLeftX} ${SVG_STAGE.wireBottomY} L ${SVG_STAGE.wireLeftX} ${SVG_STAGE.wireTopY}`}
                  className="ohms-stage-wire"
                />
                <path
                  d={`M ${SVG_STAGE.wireLeftX} ${SVG_STAGE.wireTopY} L ${SVG_STAGE.resistorCenterX - 110} ${SVG_STAGE.wireTopY}
                    M ${SVG_STAGE.resistorCenterX + 110} ${SVG_STAGE.wireTopY} L ${SVG_STAGE.wireRightX} ${SVG_STAGE.wireTopY}
                    M ${SVG_STAGE.wireRightX} ${SVG_STAGE.wireTopY} L ${SVG_STAGE.wireRightX} ${SVG_STAGE.wireBottomY}
                    M ${SVG_STAGE.wireRightX} ${SVG_STAGE.wireBottomY} L ${SVG_STAGE.rheostatX + 88} ${SVG_STAGE.wireBottomY}
                    M ${SVG_STAGE.rheostatX - 88} ${SVG_STAGE.wireBottomY} L ${SVG_STAGE.ammeterCenterX + 42} ${SVG_STAGE.wireBottomY}
                    M ${SVG_STAGE.ammeterCenterX - 42} ${SVG_STAGE.wireBottomY} L ${SVG_STAGE.switchLeftX + 74} ${SVG_STAGE.wireBottomY}
                    M ${SVG_STAGE.switchLeftX - 54} ${SVG_STAGE.wireBottomY} L ${SVG_STAGE.wireLeftX} ${SVG_STAGE.wireBottomY}
                    M ${SVG_STAGE.wireLeftX} ${SVG_STAGE.wireBottomY} L ${SVG_STAGE.wireLeftX} ${SVG_STAGE.wireTopY}`}
                  className="ohms-stage-wire is-active"
                  style={{ opacity: displayProgress }}
                />

                <line x1={SVG_STAGE.batteryX - 6} y1={SVG_STAGE.batteryTopY} x2={SVG_STAGE.batteryX - 6} y2={SVG_STAGE.batteryBottomY} className="ohms-stage-battery-plate is-short" />
                <line x1={SVG_STAGE.batteryX + 10} y1={SVG_STAGE.batteryTopY - 16} x2={SVG_STAGE.batteryX + 10} y2={SVG_STAGE.batteryBottomY + 16} className="ohms-stage-battery-plate is-long" />
                <text x={SVG_STAGE.batteryX - 18} y={SVG_STAGE.batteryTopY - 24} className="ohms-stage-battery-mark">-</text>
                <text x={SVG_STAGE.batteryX + 18} y={SVG_STAGE.batteryTopY - 24} className="ohms-stage-battery-mark">+</text>
                <text x={SVG_STAGE.batteryX + 2} y={SVG_STAGE.batteryBottomY + 44} textAnchor="middle" className="motion-stage-ruler-label">
                  {`${tt("电源")} ${mode === "iu" ? formatVoltage(metrics.targetVoltage) : formatVoltage(FIXED_VOLTAGE_V)}`}
                </text>

                <g transform={`translate(${SVG_STAGE.switchLeftX}, ${SVG_STAGE.switchY})`}>
                  <line x1="-54" y1="0" x2="-18" y2="0" className="ohms-stage-wire" />
                  <line x1="18" y1="0" x2="74" y2="0" className="ohms-stage-wire" />
                  <circle cx="-18" cy="0" r="4.5" className="ohms-stage-switch-node" />
                  <circle cx="18" cy="0" r="4.5" className="ohms-stage-switch-node" />
                  <line
                    x1="-18"
                    y1="0"
                    x2="18"
                    y2={displayProgress > 0 ? 0 : -18}
                    className="ohms-stage-switch-arm"
                  />
                  <text x="0" y="36" textAnchor="middle" className="motion-stage-ruler-label">
                    {tt("开关")}
                  </text>
                </g>

                <g transform={`translate(${SVG_STAGE.ammeterCenterX}, ${SVG_STAGE.ammeterCenterY})`}>
                  <circle r="34" className="ohms-stage-meter-body" />
                  <circle r="26" className="ohms-stage-meter-face" />
                  <line x1="0" y1="0" x2={meterNeedles.ammeter.x2 - SVG_STAGE.ammeterCenterX} y2={meterNeedles.ammeter.y2 - SVG_STAGE.ammeterCenterY} className="ohms-stage-meter-needle" />
                  <text y="-4" textAnchor="middle" className="ohms-stage-meter-label">A</text>
                  <text y="16" textAnchor="middle" className="ohms-stage-meter-value">{formatCurrent(metrics.displayedCurrent)}</text>
                  <text y="56" textAnchor="middle" className="motion-stage-ruler-label">{tt("电流表")}</text>
                </g>

                <g transform={`translate(${SVG_STAGE.resistorCenterX}, ${SVG_STAGE.resistorY})`}>
                  <rect x="-92" y="-20" width="184" height="40" rx="18" className="ohms-stage-resistor-body" />
                  <path
                    d="M -70 0 L -48 -14 L -24 14 L 0 -14 L 24 14 L 48 -14 L 70 0"
                    className="ohms-stage-resistor-zigzag"
                  />
                  <text y="-34" textAnchor="middle" className="motion-stage-ruler-label">
                    {mode === "iu"
                      ? `${tt("定值电阻")} ${formatResistance(FIXED_RESISTANCE_OHM)}`
                      : `${tt("更换电阻")} ${formatResistance(resistanceValue)}`}
                  </text>
                </g>

                <g transform={`translate(${SVG_STAGE.voltmeterCenterX}, ${SVG_STAGE.voltmeterCenterY})`}>
                  <circle r="34" className="ohms-stage-meter-body is-voltmeter" />
                  <circle r="26" className="ohms-stage-meter-face" />
                  <line x1="0" y1="0" x2={meterNeedles.voltmeter.x2 - SVG_STAGE.voltmeterCenterX} y2={meterNeedles.voltmeter.y2 - SVG_STAGE.voltmeterCenterY} className="ohms-stage-meter-needle is-voltmeter" />
                  <text y="-4" textAnchor="middle" className="ohms-stage-meter-label">V</text>
                  <text y="16" textAnchor="middle" className="ohms-stage-meter-value">{formatVoltage(metrics.displayedVoltage)}</text>
                  <text y="56" textAnchor="middle" className="motion-stage-ruler-label">{tt("电压表")}</text>
                </g>
                <path
                  d={`M ${SVG_STAGE.resistorCenterX - 78} ${SVG_STAGE.wireTopY} L ${SVG_STAGE.resistorCenterX - 78} ${SVG_STAGE.voltmeterCenterY}
                    L ${SVG_STAGE.voltmeterCenterX - 34} ${SVG_STAGE.voltmeterCenterY}
                    M ${SVG_STAGE.voltmeterCenterX + 34} ${SVG_STAGE.voltmeterCenterY} L ${SVG_STAGE.resistorCenterX + 78} ${SVG_STAGE.voltmeterCenterY}
                    L ${SVG_STAGE.resistorCenterX + 78} ${SVG_STAGE.wireTopY}`}
                  className="ohms-stage-branch-wire"
                />

                <g transform={`translate(${SVG_STAGE.rheostatX}, ${SVG_STAGE.rheostatY})`}>
                  <rect x="-88" y="-18" width="176" height="36" rx="18" className="ohms-stage-rheostat-body" />
                  <path d="M -54 -28 L 18 -4" className="ohms-stage-rheostat-arrow" />
                  <circle cx="20" cy="-6" r="6" className="ohms-stage-rheostat-knob" />
                  <text y="44" textAnchor="middle" className="motion-stage-ruler-label">
                    {mode === "iu" ? tt("调压观察") : tt("滑阻调到 U = 6 V")}
                  </text>
                </g>

                <text x={SVG_STAGE.circuitPanelX + 34} y={SVG_STAGE.circuitPanelY + 214} className="ohms-stage-stage-note">
                  {mode === "iu"
                    ? tt("只改变电压：滑动变阻器/电源调节后，观察电流如何沿直线关系变化。")
                    : tt("只改变电阻：每次更换电阻后，再调节滑阻，使电压表示数重新锁定在 6 V。")}
                </text>
              </g>

              <rect
                x={SVG_STAGE.graphPanelX}
                y={SVG_STAGE.graphPanelY}
                width={SVG_STAGE.graphPanelWidth}
                height={SVG_STAGE.graphPanelHeight}
                rx="28"
                className="motion-stage-graph-shell"
              />
              <text x={SVG_STAGE.graphPanelX + 28} y={SVG_STAGE.graphPanelY + 34} className="motion-stage-panel-title">
                {tt(activePreset.graphTitle)}
                <tspan className="motion-stage-panel-note-inline">
                  {tt(activePreset.graphNote)}
                </tspan>
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
              <polyline points={graphGeometry.focusPolyline} className="ohms-stage-graph-focus" style={{ opacity: Math.max(0.24, displayProgress) }} />
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
              {graphGeometry.recordedPoints.map((point) => (
                <g key={point.key}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="6"
                    className="ohms-stage-record-point"
                  />
                  <text x={point.x} y={point.y - 12} textAnchor="middle" className="ohms-stage-record-label">
                    {point.label}
                  </text>
                </g>
              ))}

              <g transform={`translate(${SVG_STAGE.graphPanelX + 732}, ${SVG_STAGE.graphPanelY + 58})`}>
                {summaryItems.map((item, index) => (
                  <g key={item.label} transform={`translate(0, ${index * 40})`}>
                    <text x="0" y="0" className="ohms-stage-summary-label">
                      {item.label}
                    </text>
                    <text x="0" y="18" className="ohms-stage-summary-value">
                      {item.value}
                    </text>
                  </g>
                ))}
              </g>
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

  function applyMode(nextMode: StudyMode) {
    setMode(nextMode);
    if (nextMode === "iu") {
      const nextValue = getFirstPendingValue(nextMode, records) ?? VOLTAGE_SEQUENCE[0];
      setVoltageValue(nextValue);
    } else {
      const nextValue = getFirstPendingValue(nextMode, records) ?? RESISTANCE_SEQUENCE[0];
      setResistanceValue(nextValue);
    }
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

    const nextRecords: RecordBuckets = {
      iu: { ...records.iu },
      ir: { ...records.ir },
    };

    nextRecords[mode][currentGroupKey] = {
      key: currentGroupKey,
      value: buildRecordValue({
        mode,
        voltage: metrics.targetVoltage,
        current: metrics.targetCurrent,
        resistance: metrics.targetResistance,
      }),
      note: buildRecordNote({
        mode,
        voltage: metrics.targetVoltage,
        current: metrics.targetCurrent,
        resistance: metrics.targetResistance,
        isZh,
      }),
    };

    setRecords(nextRecords);

    const nextValue = getFirstPendingValue(mode, nextRecords);
    if (nextValue !== null) {
      if (mode === "iu") {
        setVoltageValue(nextValue);
      } else {
        setResistanceValue(nextValue);
      }
      invalidateObservation();
      return;
    }

    const nextMode = mode === "iu" ? "ir" : "iu";
    const nextModeValue = getFirstPendingValue(nextMode, nextRecords);
    if (nextModeValue !== null) {
      setMode(nextMode);
      if (nextMode === "iu") {
        setVoltageValue(nextModeValue);
      } else {
        setResistanceValue(nextModeValue);
      }
      invalidateObservation();
    }
  }

  function resetLab() {
    clearObservationTimer(timerRef.current);
    timerRef.current = null;
    setMode("iu");
    setVoltageValue(VOLTAGE_SEQUENCE[0]);
    setResistanceValue(RESISTANCE_SEQUENCE[0]);
    setObservationState("idle");
    setProgress(0);
    setRecords({
      iu: {},
      ir: {},
    });
  }
}

function buildLawMetrics({
  mode,
  voltageValue,
  resistanceValue,
  displayProgress,
}: {
  mode: StudyMode;
  voltageValue: number;
  resistanceValue: number;
  displayProgress: number;
}): LawMetrics {
  const targetVoltage = mode === "iu" ? voltageValue : FIXED_VOLTAGE_V;
  const targetResistance = mode === "iu" ? FIXED_RESISTANCE_OHM : resistanceValue;
  const targetCurrent = targetVoltage / targetResistance;
  const displayedVoltage = mode === "iu"
    ? targetVoltage * displayProgress
    : FIXED_VOLTAGE_V;
  const displayedCurrent = targetCurrent * displayProgress;
  const ratioUI = displayedCurrent <= 0.0001 ? null : displayedVoltage / displayedCurrent;
  const productIR = displayedCurrent * targetResistance;

  return {
    targetVoltage,
    targetResistance,
    targetCurrent,
    displayedVoltage,
    displayedResistance: targetResistance,
    displayedCurrent,
    ratioUI,
    productIR,
  };
}

function describeObservation({
  mode,
  metrics,
  isZh,
}: {
  mode: StudyMode;
  metrics: LawMetrics;
  isZh: boolean;
}) {
  if (mode === "iu") {
    return isZh
      ? `保持 R = ${formatResistance(metrics.targetResistance)} 不变，把电压调到 ${formatVoltage(metrics.targetVoltage)} 后，电流会稳定在 ${formatCurrent(metrics.targetCurrent)}，U / I 始终等于 ${formatResistance(metrics.targetResistance)}。`
      : `With R fixed, ${formatVoltage(metrics.targetVoltage)} leads to ${formatCurrent(metrics.targetCurrent)} and U / I stays constant.`;
  }

  return isZh
    ? `保持 U = ${formatVoltage(metrics.targetVoltage)} 不变，更换为 ${formatResistance(metrics.targetResistance)} 后，电流会稳定在 ${formatCurrent(metrics.targetCurrent)}，I × R 始终等于 ${formatVoltage(metrics.targetVoltage)}。`
    : `With U fixed, ${formatResistance(metrics.targetResistance)} gives ${formatCurrent(metrics.targetCurrent)} and I × R stays constant.`;
}

function buildRecordGroups({
  records,
  currentMode,
  currentValue,
  isZh,
}: {
  records: RecordBuckets;
  currentMode: StudyMode;
  currentValue: number;
  isZh: boolean;
}) {
  return [
    {
      key: "iu",
      title: isZh ? "表一：R 一定，研究 I-U" : "Table 1: Fixed R, study I-U",
      countLabel: isZh ? `${Object.keys(records.iu).length} / 4 组` : `${Object.keys(records.iu).length} / 4 runs`,
      isActive: currentMode === "iu",
      helper: isZh
        ? "保持定值电阻 10 Ω 不变，依次记录 2V、4V、6V、8V 对应的电流。"
        : "Keep R = 10Ω fixed and record the current at 2V, 4V, 6V, and 8V.",
      rows: VOLTAGE_SEQUENCE.map((value) => {
        const record = records.iu[buildGroupKey("iu", value)];
        return {
          key: `iu-${value}`,
          label: `${value} V`,
          value: record?.value ?? "",
          note: record?.note ?? (isZh ? "固定 R = 10 Ω" : "Keep R = 10Ω"),
          isPending: !record,
          isCurrent: currentMode === "iu" && value === currentValue,
        };
      }),
      conclusion:
        Object.keys(records.iu).length === VOLTAGE_SEQUENCE.length
          ? (isZh
            ? "结论：定值电阻一定时，电压翻倍，电流也翻倍，I-U 图像是一条过原点的直线。"
            : "Conclusion: with fixed resistance, doubling U doubles I.")
          : undefined,
    },
    {
      key: "ir",
      title: isZh ? "表二：U 一定，研究 I-R" : "Table 2: Fixed U, study I-R",
      countLabel: isZh ? `${Object.keys(records.ir).length} / 4 组` : `${Object.keys(records.ir).length} / 4 runs`,
      isActive: currentMode === "ir",
      helper: isZh
        ? "保持电压 6 V 不变，依次更换 5Ω、10Ω、15Ω、20Ω 电阻。"
        : "Keep U = 6V fixed and replace the resistor with 5Ω, 10Ω, 15Ω, and 20Ω.",
      rows: RESISTANCE_SEQUENCE.map((value) => {
        const record = records.ir[buildGroupKey("ir", value)];
        return {
          key: `ir-${value}`,
          label: `${value} Ω`,
          value: record?.value ?? "",
          note: record?.note ?? (isZh ? "固定 U = 6 V" : "Keep U = 6V"),
          isPending: !record,
          isCurrent: currentMode === "ir" && value === currentValue,
        };
      }),
      conclusion:
        Object.keys(records.ir).length === RESISTANCE_SEQUENCE.length
          ? (isZh
            ? "结论：电压一定时，电阻越大，电流越小，I × R 始终等于电压，I-R 图像呈反比例关系。"
            : "Conclusion: with fixed voltage, larger resistance means smaller current.")
          : undefined,
    },
  ];
}

function buildRecordValue({
  mode,
  voltage,
  current,
  resistance,
}: {
  mode: StudyMode;
  voltage: number;
  current: number;
  resistance: number;
}) {
  if (mode === "iu") {
    return `U=${formatVoltage(voltage)} · I=${formatCurrent(current)} · U/I=${formatResistance(resistance)}`;
  }

  return `R=${formatResistance(resistance)} · I=${formatCurrent(current)} · I×R=${formatVoltage(voltage)}`;
}

function buildRecordNote({
  mode,
  voltage,
  current,
  resistance,
  isZh,
}: {
  mode: StudyMode;
  voltage: number;
  current: number;
  resistance: number;
  isZh: boolean;
}) {
  if (mode === "iu") {
    return isZh
      ? `当 U = ${formatVoltage(voltage)} 时，I = ${formatCurrent(current)}，比值 U / I 恒定为 ${formatResistance(resistance)}。`
      : `At U=${formatVoltage(voltage)}, I=${formatCurrent(current)} and U/I stays constant.`;
  }

  return isZh
    ? `当 R = ${formatResistance(resistance)} 时，I = ${formatCurrent(current)}，乘积 I × R 恒定为 ${formatVoltage(voltage)}。`
    : `At R=${formatResistance(resistance)}, I=${formatCurrent(current)} and I×R stays constant.`;
}

function buildFullSeries(mode: StudyMode) {
  if (mode === "iu") {
    return Array.from({ length: 41 }, (_, index) => {
      const voltage = (8 / 40) * index;
      return {
        xValue: voltage,
        yValue: voltage / FIXED_RESISTANCE_OHM,
      };
    });
  }

  return Array.from({ length: 61 }, (_, index) => {
    const resistance = 5 + (15 / 60) * index;
    return {
      xValue: resistance,
      yValue: FIXED_VOLTAGE_V / resistance,
    };
  });
}

function buildRecordedGraphPoints(mode: StudyMode, records: RecordBuckets) {
  const entries = mode === "iu"
    ? VOLTAGE_SEQUENCE.map((value) => ({ key: buildGroupKey("iu", value), xValue: value, yValue: value / FIXED_RESISTANCE_OHM, label: `${value}V` }))
    : RESISTANCE_SEQUENCE.map((value) => ({ key: buildGroupKey("ir", value), xValue: value, yValue: FIXED_VOLTAGE_V / value, label: `${value}Ω` }));

  return entries.filter((entry) => Boolean(records[mode][entry.key]));
}

function buildGraphGeometry({
  mode,
  currentXValue,
  currentYValue,
  recordedPoints,
  series,
  x,
  y,
  width,
  height,
}: {
  mode: StudyMode;
  currentXValue: number;
  currentYValue: number;
  recordedPoints: Array<{
    key: string;
    xValue: number;
    yValue: number;
    label: string;
  }>;
  series: GraphPoint[];
  x: number;
  y: number;
  width: number;
  height: number;
}): GraphGeometry {
  const padding = { top: 54, right: 28, bottom: 38, left: 58 };
  const chartLeft = x + padding.left;
  const chartRight = x + width - padding.right;
  const chartTop = y + padding.top;
  const chartBottom = y + height - padding.bottom;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  const xMin = mode === "iu" ? 0 : 5;
  const xMax = mode === "iu" ? 8 : 20;
  const yMax = 1.2;

  const mapX = (value: number) =>
    chartLeft + chartWidth * ((value - xMin) / Math.max(0.0001, xMax - xMin));
  const mapY = (value: number) =>
    chartBottom - chartHeight * (value / yMax);

  const fullPolyline = series
    .map((point) => `${mapX(point.xValue)},${mapY(point.yValue)}`)
    .join(" ");

  const focusSeries = series.filter((point) => point.xValue <= currentXValue + 0.0001);
  const safeFocusSeries = focusSeries.length > 0 ? focusSeries : [series[0]];
  const focusPolyline = safeFocusSeries
    .map((point) => `${mapX(point.xValue)},${mapY(point.yValue)}`)
    .join(" ");

  return {
    chartTop,
    chartBottom,
    fullPolyline,
    focusPolyline,
    currentPoint: {
      x: mapX(currentXValue),
      y: mapY(currentYValue),
    },
    recordedPoints: recordedPoints.map((point) => ({
      key: point.key,
      x: mapX(point.xValue),
      y: mapY(point.yValue),
      label: point.label,
    })),
    yTicks: Array.from({ length: 5 }).map((_, index) => {
      const ratio = index / 4;
      const value = yMax * (1 - ratio);
      const lineY = chartTop + chartHeight * ratio;
      return {
        key: `y-${index}`,
        x1: chartLeft,
        x2: chartRight,
        y: lineY,
        labelX: x + 12,
        label: `${value.toFixed(1)} A`,
      };
    }),
    xTicks: (mode === "iu" ? [0, 2, 4, 6, 8] : [5, 10, 15, 20]).map((value) => ({
      key: `x-${value}`,
      x: mapX(value),
      y1: chartTop,
      y2: chartBottom,
      labelY: y + height - 10,
      label: mode === "iu" ? `${value} V` : `${value} Ω`,
    })),
  };
}

function buildComparisonRows({
  mode,
  records,
  isZh,
  currentValue,
}: {
  mode: StudyMode;
  records: RecordBuckets;
  isZh: boolean;
  currentValue: number;
}) {
  const sequence = mode === "iu" ? VOLTAGE_SEQUENCE : RESISTANCE_SEQUENCE;
  const points = sequence.map((value) => ({
    value,
    current: mode === "iu" ? value / FIXED_RESISTANCE_OHM : FIXED_VOLTAGE_V / value,
  }));
  const maxCurrent = Math.max(...points.map((point) => point.current), 0.0001);

  return points.map((point) => ({
    key: `${mode}-${point.value}`,
    label: mode === "iu" ? `${point.value} V` : `${point.value} Ω`,
    valueLabel: records[mode][buildGroupKey(mode, point.value)]
      ? formatCurrent(point.current)
      : (isZh ? "待测" : "Pending"),
    percent: Math.max(10, (point.current / maxCurrent) * 100),
    active: point.value === currentValue,
  }));
}

function buildGroupKey(mode: StudyMode, value: number) {
  return `${mode}-${value}`;
}

function getFirstPendingValue(mode: StudyMode, records: RecordBuckets) {
  const sequence = mode === "iu" ? VOLTAGE_SEQUENCE : RESISTANCE_SEQUENCE;
  const nextValue = sequence.find((value) => !records[mode][buildGroupKey(mode, value)]);
  return nextValue ?? null;
}

function describeNeedle(centerX: number, centerY: number, radius: number, ratio: number) {
  const startDeg = -132;
  const endDeg = 132;
  const degrees = startDeg + (endDeg - startDeg) * ratio;
  const radians = (degrees * Math.PI) / 180;
  return {
    x2: centerX + Math.cos(radians) * radius,
    y2: centerY + Math.sin(radians) * radius,
  };
}

function formatVoltage(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "")} V`;
}

function formatCurrent(value: number) {
  return `${value.toFixed(2)} A`;
}

function formatResistance(value: number) {
  return `${value.toFixed(0)} Ω`;
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
