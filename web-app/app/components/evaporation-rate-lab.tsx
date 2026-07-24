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

type EvaporationRateLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type StudyFactor = "temperature" | "area" | "wind";
type ObservationState = "idle" | "observing" | "stable";
type TimerId = ReturnType<typeof setInterval>;

type FactorPreset = {
  key: StudyFactor;
  stepLabel: string;
  label: string;
  summary: string;
  focus: string;
  variableLabel: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
};

type FactorRecord = {
  key: StudyFactor;
  value: string;
  note: string;
};

type ExperimentScenario = {
  label: string;
  shortLabel: string;
  temperatureC: number;
  areaCm2: number;
  windMs: number;
  rateMlPerHour: number;
  totalEvaporationMl: number;
};

type EvaporationPoint = {
  timeHours: number;
  evaporatedMl: number;
  remainingMl: number;
  rateMlPerHour: number;
};

type FactorSummaryItem = {
  label: string;
  value: string;
};

const PANEL_COLLAPSED_STORAGE_KEY = "easy-teaching.evaporation-rate.panel-collapsed";
const OBSERVATION_TICK_MS = 40;
const OBSERVATION_DURATION_MS = 1200;
const OBSERVATION_WINDOW_HOURS = 4;
const GRAPH_SAMPLE_COUNT = 64;
const INITIAL_WATER_ML = 100;
const BASELINE_TEMPERATURE_C = 25;
const BASELINE_AREA_CM2 = 28;
const BASELINE_WIND_MS = 0;
const STEP_SEQUENCE: StudyFactor[] = ["temperature", "area", "wind"];

const FACTOR_PRESETS: Record<StudyFactor, FactorPreset> = {
  temperature: {
    key: "temperature",
    stepLabel: "1",
    label: "温度影响",
    summary: "保持表面积和风速不变，只比较液体温度对蒸发快慢的影响。",
    focus: "温度越高，液体分子运动越剧烈，单位时间内逸出液面的分子更多，所以蒸发更快。",
    variableLabel: "对比温度",
    defaultValue: 60,
    min: 20,
    max: 80,
    step: 1,
    unit: "°C",
  },
  area: {
    key: "area",
    stepLabel: "2",
    label: "表面积影响",
    summary: "保持温度和风速不变，只比较液面表面积对蒸发快慢的影响。",
    focus: "表面积越大，暴露在空气中的液体分子越多，所以蒸发更快。",
    variableLabel: "对比表面积",
    defaultValue: 150,
    min: 28,
    max: 180,
    step: 2,
    unit: "cm²",
  },
  wind: {
    key: "wind",
    stepLabel: "3",
    label: "风速影响",
    summary: "保持温度和表面积不变，只比较液面空气流速对蒸发快慢的影响。",
    focus: "风速越大，液面附近的水蒸气越快被带走，蒸发就越快。",
    variableLabel: "对比风速",
    defaultValue: 3,
    min: 0,
    max: 4,
    step: 0.5,
    unit: "m/s",
  },
};

const SVG_STAGE = {
  width: 1160,
  height: 760,
  vesselPanelX: 60,
  vesselPanelY: 76,
  vesselPanelWidth: 1040,
  vesselPanelHeight: 270,
  graphPanelX: 60,
  graphPanelY: 368,
  graphPanelWidth: 1040,
  graphPanelHeight: 286,
  baselineCenterX: 316,
  compareCenterX: 844,
  vesselBaseY: 300,
};

export function EvaporationRateLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: EvaporationRateLabProps) {
  const { isZh, tt } = useLocale();
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  const [activeFactor, setActiveFactor] = useState<StudyFactor>("temperature");
  const [comparedTemperatureC, setComparedTemperatureC] = useState(FACTOR_PRESETS.temperature.defaultValue);
  const [comparedAreaCm2, setComparedAreaCm2] = useState(FACTOR_PRESETS.area.defaultValue);
  const [comparedWindMs, setComparedWindMs] = useState(FACTOR_PRESETS.wind.defaultValue);
  const [observationState, setObservationState] = useState<ObservationState>("idle");
  const [currentTimeHours, setCurrentTimeHours] = useState(0);
  const [records, setRecords] = useState<Partial<Record<StudyFactor, FactorRecord>>>({});
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

  const activePreset = FACTOR_PRESETS[activeFactor];
  const baselineScenario = useMemo(
    () =>
      buildScenario({
        label: isZh ? "基准组" : "Baseline",
        shortLabel: isZh ? "基准" : "Base",
        temperatureC: BASELINE_TEMPERATURE_C,
        areaCm2: BASELINE_AREA_CM2,
        windMs: BASELINE_WIND_MS,
      }),
    [isZh],
  );
  const compareScenario = useMemo(
    () =>
      buildCompareScenario({
        activeFactor,
        comparedAreaCm2,
        comparedTemperatureC,
        comparedWindMs,
        isZh,
      }),
    [activeFactor, comparedAreaCm2, comparedTemperatureC, comparedWindMs, isZh],
  );

  const baselineSeries = useMemo(
    () => buildSeries(baselineScenario),
    [baselineScenario],
  );
  const compareSeries = useMemo(
    () => buildSeries(compareScenario),
    [compareScenario],
  );
  const baselinePoint = useMemo(
    () => resolveEvaporationPoint(baselineScenario, currentTimeHours),
    [baselineScenario, currentTimeHours],
  );
  const comparePoint = useMemo(
    () => resolveEvaporationPoint(compareScenario, currentTimeHours),
    [compareScenario, currentTimeHours],
  );

  const graphGeometry = useMemo(
    () =>
      buildEvaporationGraph({
        baselineSeries,
        compareSeries,
        currentTimeHours,
        x: SVG_STAGE.graphPanelX,
        y: SVG_STAGE.graphPanelY,
        width: SVG_STAGE.graphPanelWidth,
        height: SVG_STAGE.graphPanelHeight,
        maxEvaporationMl: Math.max(10, baselineScenario.totalEvaporationMl, compareScenario.totalEvaporationMl) * 1.12,
      }),
    [baselineScenario.totalEvaporationMl, baselineSeries, compareScenario.totalEvaporationMl, compareSeries, currentTimeHours],
  );

  const progress = OBSERVATION_WINDOW_HOURS <= 0 ? 0 : currentTimeHours / OBSERVATION_WINDOW_HOURS;
  const currentFactorRecorded = Boolean(records[activeFactor]);
  const recordedCount = STEP_SEQUENCE.filter((key) => records[key]).length;
  const isRecordEnabled = observationState === "stable";
  const improvementRatio = compareScenario.rateMlPerHour / Math.max(baselineScenario.rateMlPerHour, 0.0001);
  const evaporationDeltaMl = comparePoint.evaporatedMl - baselinePoint.evaporatedMl;

  const stageMeta = useMemo(() => {
    const observationCopy = describeObservation({
      factor: activeFactor,
      baselineScenario,
      compareScenario,
      baselinePoint,
      comparePoint,
      isZh,
    });

    if (observationState === "stable") {
      return {
        label: isZh ? "读数稳定" : "Stable reading",
        tone: "balanced" as const,
        copy: observationCopy,
      };
    }

    if (observationState === "observing") {
      return {
        label: isZh ? "观察中" : "Observing",
        tone: "active" as const,
        copy: observationCopy,
      };
    }

    return {
      label: isZh ? "待观察" : "Ready",
      tone: "warning" as const,
      copy: activePreset.summary,
    };
  }, [activeFactor, activePreset.summary, baselinePoint, baselineScenario, comparePoint, compareScenario, isZh, observationState]);

  const stepItems = STEP_SEQUENCE.map((key) => {
    const preset = FACTOR_PRESETS[key];
    return {
      key,
      stepLabel: preset.stepLabel,
      label: tt(preset.label),
      active: activeFactor === key,
      title: tt(preset.summary),
      onClick: () => applyFactor(key),
    };
  });

  const factorSummaryItems: FactorSummaryItem[] = useMemo(
    () => [
      {
        label: isZh ? "当前研究变量" : "Studied variable",
        value: tt(activePreset.label),
      },
      {
        label: isZh ? "4 h 速率倍率" : "4h rate ratio",
        value: `${improvementRatio.toFixed(2)} ×`,
      },
    ],
    [activePreset.label, improvementRatio, isZh, tt],
  );

  const comparisonRows = useMemo(() => {
    const maxValue = Math.max(baselineScenario.totalEvaporationMl, compareScenario.totalEvaporationMl, 0.0001);
    return [
      {
        key: "baseline",
        label: baselineScenario.label,
        valueLabel: formatMl(baselinePoint.evaporatedMl),
        percent: Math.max(10, (baselinePoint.evaporatedMl / maxValue) * 100),
        active: false,
      },
      {
        key: "compare",
        label: compareScenario.label,
        valueLabel: formatMl(comparePoint.evaporatedMl),
        percent: Math.max(10, (comparePoint.evaporatedMl / maxValue) * 100),
        active: true,
      },
    ];
  }, [baselinePoint.evaporatedMl, baselineScenario.label, baselineScenario.totalEvaporationMl, comparePoint.evaporatedMl, compareScenario.label, compareScenario.totalEvaporationMl]);

  const recordGroups = [
    {
      key: "evaporation",
      title: isZh ? "三组蒸发对照" : "Three evaporation checks",
      countLabel: isZh ? `${recordedCount} / 3 组` : `${recordedCount} / 3 runs`,
      isActive: true,
      helper: isZh
        ? "保持同量水，只改变一个变量，依次记录温度、表面积和风速对蒸发快慢的影响。"
        : "Keep the same amount of water and change only one variable at a time.",
      rows: STEP_SEQUENCE.map((key) => {
        const preset = FACTOR_PRESETS[key];
        const record = records[key];
        return {
          key,
          label: tt(preset.label),
          value: record?.value ?? "",
          note: record?.note ?? tt(preset.focus),
          isPending: !record,
          isCurrent: activeFactor === key,
        };
      }),
      conclusion:
        recordedCount === STEP_SEQUENCE.length
          ? (isZh
            ? "课堂结论：液体温度越高、表面积越大、液面空气流速越大，蒸发都越快；研究某个因素时必须保持其余因素不变。"
            : "Conclusion: higher temperature, larger surface area, and faster airflow all speed up evaporation.")
          : undefined,
    },
  ];

  const variableControl = useMemo(() => {
    if (activeFactor === "temperature") {
      return {
        id: "evaporation-compare-temperature",
        label: isZh ? "对比温度" : "Compare temperature",
        value: comparedTemperatureC,
        min: FACTOR_PRESETS.temperature.min,
        max: FACTOR_PRESETS.temperature.max,
        step: FACTOR_PRESETS.temperature.step,
        unit: FACTOR_PRESETS.temperature.unit,
        onChange: (value: number) => {
          setComparedTemperatureC(value);
          invalidateObservation();
        },
      };
    }

    if (activeFactor === "area") {
      return {
        id: "evaporation-compare-area",
        label: isZh ? "对比表面积" : "Compare surface area",
        value: comparedAreaCm2,
        min: FACTOR_PRESETS.area.min,
        max: FACTOR_PRESETS.area.max,
        step: FACTOR_PRESETS.area.step,
        unit: FACTOR_PRESETS.area.unit,
        onChange: (value: number) => {
          setComparedAreaCm2(value);
          invalidateObservation();
        },
      };
    }

    return {
      id: "evaporation-compare-wind",
      label: isZh ? "对比风速" : "Compare airflow",
      value: comparedWindMs,
      min: FACTOR_PRESETS.wind.min,
      max: FACTOR_PRESETS.wind.max,
      step: FACTOR_PRESETS.wind.step,
      unit: FACTOR_PRESETS.wind.unit,
      onChange: (value: number) => {
        setComparedWindMs(value);
        invalidateObservation();
      },
    };
  }, [activeFactor, comparedAreaCm2, comparedTemperatureC, comparedWindMs, isZh]);

  const primaryActionLabel = observationState === "observing"
    ? (isZh ? "观察中…" : "Observing…")
    : observationState === "stable"
      ? (isZh ? "重新观察" : "Replay")
      : (isZh ? "开始观察" : "Start");
  const recordButtonLabel = currentFactorRecorded
    ? (isZh ? "更新本组" : "Update current run")
    : (isZh ? "记录本组" : "Record current run");

  return (
    <section ref={fullscreenRef} className="visual-shell force-lab-shell evaporation-lab-shell">
      <div
        className={
          isControlPanelCollapsed
            ? "force-lab-layout evaporation-lab-layout is-collapsed"
            : "force-lab-layout evaporation-lab-layout"
        }
      >
        <aside
          className={
            isControlPanelCollapsed
              ? "force-control-panel evaporation-control-panel is-collapsed"
              : "force-control-panel evaporation-control-panel"
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

              <div className="force-control-scroll evaporation-control-scroll">
                <ControlPanelSection
                  title={isZh ? "课堂主流程" : "Classroom Flow"}
                  hint={isZh ? "先锁定变量，再观察蒸发曲线，最后记录结论" : "Lock the variables, observe the curves, then record the conclusion"}
                  accent
                >
                  <ControlStatusBar
                    items={[
                      <StatusPill key="factor">{tt(activePreset.label)}</StatusPill>,
                      <StatusPill key="record">{isZh ? `${recordedCount} / 3 已记录` : `${recordedCount} / 3 recorded`}</StatusPill>,
                    ]}
                    status={<StatusPill tone={stageMeta.tone}>{stageMeta.label}</StatusPill>}
                  />
                  <p className="force-inline-copy">{tt(activePreset.summary)}</p>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "研究变量" : "Study Variable"}
                  hint={isZh ? "切换变量时，旧读数会失效，需要重新观察" : "Switching the factor invalidates the previous reading"}
                >
                  <ControlChipGroup
                    items={STEP_SEQUENCE.map((key) => ({
                      key,
                      label: tt(FACTOR_PRESETS[key].label),
                      active: activeFactor === key,
                      onClick: () => applyFactor(key),
                    }))}
                    columns={2}
                    size="dense"
                  />

                  <ControlRange
                    id={variableControl.id}
                    label={variableControl.label}
                    min={variableControl.min}
                    max={variableControl.max}
                    step={variableControl.step}
                    unit={variableControl.unit}
                    value={variableControl.value}
                    editable
                    onChange={variableControl.onChange}
                  />

                  <div className="pressure-inline-lock-grid">
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "基准温度" : "Base temp"}</span>
                      <strong className="force-insight-value">{`${BASELINE_TEMPERATURE_C} °C`}</strong>
                    </article>
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "基准表面积" : "Base area"}</span>
                      <strong className="force-insight-value">{`${BASELINE_AREA_CM2} cm²`}</strong>
                    </article>
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "基准风速" : "Base airflow"}</span>
                      <strong className="force-insight-value">{`${BASELINE_WIND_MS} m/s`}</strong>
                    </article>
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "水量" : "Water volume"}</span>
                      <strong className="force-insight-value">{`${INITIAL_WATER_ML} mL`}</strong>
                    </article>
                  </div>

                  <p className="force-inline-copy">{tt(activePreset.focus)}</p>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "操作与记录" : "Observe & Record"}
                  hint={isZh ? "观察稳定后再记录，系统会自动跳到下一组变量" : "Record after the reading stabilizes"}
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
                    emptyTitle={isZh ? "先完成第一组对照" : "Finish the first comparison"}
                    emptyCopy={
                      isZh
                        ? "记录单会保留温度、表面积和风速三组对照，方便最后统一归纳蒸发快慢的影响因素。"
                        : "The worksheet keeps temperature, area, and airflow comparisons for the final conclusion."
                    }
                    pendingCopy={isZh ? "待测" : "Pending"}
                  />
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "思考提示" : "Think Prompt"}
                  hint={isZh ? "帮助课堂归纳控制变量法和蒸发规律" : "Guide the classroom conclusion"}
                >
                  <ul className="force-support-question-list">
                    <li>{isZh ? "为什么研究温度时，表面积和风速必须保持不变？" : "Why must area and airflow stay fixed when studying temperature?"}</li>
                    <li>{isZh ? "为什么电风扇吹过皮肤时会感觉更凉？" : "Why does skin feel cooler when a fan blows across it?"}</li>
                    <li>{isZh ? "蒸发和沸腾都属于汽化，它们的发生部位有什么不同？" : "Both evaporation and boiling are vaporization. How do their locations differ?"}</li>
                  </ul>
                </ControlPanelSection>
              </div>
            </>
          )}
        </aside>

        <div className="force-lab-main evaporation-lab-main">
          <div className="force-toolbar">
            <div className="force-toolbar-status">
              <StatusPill tone="active">{tt("液体蒸发快慢")}</StatusPill>
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

          <div className="visual-canvas motion-stage-canvas evaporation-stage-canvas">
            <ControlStepGroup
              className="force-stage-overlay is-top-center force-stage-stepbar evaporation-stage-stepbar"
              items={stepItems}
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
                  <span style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }} />
                </div>
                <div className="force-stage-chip-grid">
                  <span className="force-stage-chip">{tt(`${activePreset.variableLabel}`)}</span>
                  <span className="force-stage-chip">{`${baselineScenario.rateMlPerHour.toFixed(2)} → ${compareScenario.rateMlPerHour.toFixed(2)} mL/h`}</span>
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
                    <strong>{formatHours(currentTimeHours)}</strong>
                    <span>{isZh ? "时间 t" : "Time t"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{formatMl(baselinePoint.evaporatedMl)}</strong>
                    <span>{isZh ? "基准组蒸发量" : "Baseline evaporation"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{formatMl(comparePoint.evaporatedMl)}</strong>
                    <span>{isZh ? "对比组蒸发量" : "Compared evaporation"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{formatMl(evaporationDeltaMl)}</strong>
                    <span>{isZh ? "差值 Δm" : "Delta Δm"}</span>
                  </article>
                </div>
              </div>
            </div>

            <div className="force-stage-overlay is-bottom-right">
              <div className="force-stage-hud-card is-tight pressure-stage-comparison-card">
                <div className="force-stage-hud-head">
                  <span className="force-stage-hud-title">{isZh ? "蒸发量对照" : "Evaporation Comparison"}</span>
                  <span className="force-stage-chip">{`${recordedCount} / 3`}</span>
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
              className="motion-stage-svg evaporation-stage-svg"
              role="img"
              aria-label={isZh ? `${tt(topic.title)}可视化示意图` : `${tt(topic.title)} visualization`}
            >
              <rect
                x={SVG_STAGE.vesselPanelX}
                y={SVG_STAGE.vesselPanelY}
                width={SVG_STAGE.vesselPanelWidth}
                height={SVG_STAGE.vesselPanelHeight}
                rx="34"
                className="motion-stage-panel-shell"
              />
              <text x={SVG_STAGE.vesselPanelX + 34} y={SVG_STAGE.vesselPanelY + 30} className="motion-stage-panel-title">
                {tt("双组蒸发对照")}
              </text>
              <text x={SVG_STAGE.vesselPanelX + 34} y={SVG_STAGE.vesselPanelY + 54} className="motion-stage-panel-copy">
                {tt("保持同量水，只改变当前研究变量，其余条件全部锁定。")}
              </text>

              <EvaporationVessel
                scenario={baselineScenario}
                point={baselinePoint}
                centerX={SVG_STAGE.baselineCenterX}
                baseY={SVG_STAGE.vesselBaseY}
                label={isZh ? "基准组" : "Baseline"}
                tone="baseline"
              />
              <EvaporationVessel
                scenario={compareScenario}
                point={comparePoint}
                centerX={SVG_STAGE.compareCenterX}
                baseY={SVG_STAGE.vesselBaseY}
                label={compareScenario.label}
                tone="compare"
              />

              <line
                x1={SVG_STAGE.vesselPanelX + 40}
                y1={SVG_STAGE.vesselBaseY + 34}
                x2={SVG_STAGE.vesselPanelX + SVG_STAGE.vesselPanelWidth - 40}
                y2={SVG_STAGE.vesselBaseY + 34}
                className="evaporation-stage-ground-line"
              />

              <text
                x={(SVG_STAGE.baselineCenterX + SVG_STAGE.compareCenterX) / 2}
                y={SVG_STAGE.vesselPanelY + 112}
                textAnchor="middle"
                className="evaporation-stage-compare-copy"
              >
                {tt(getCentralStageCopy(activeFactor, isZh))}
              </text>

              <rect
                x={SVG_STAGE.graphPanelX}
                y={SVG_STAGE.graphPanelY}
                width={SVG_STAGE.graphPanelWidth}
                height={SVG_STAGE.graphPanelHeight}
                rx="28"
                className="motion-stage-graph-shell"
              />
              <text x={SVG_STAGE.graphPanelX + 28} y={SVG_STAGE.graphPanelY + 34} className="motion-stage-panel-title">
                {tt("蒸发量 - 时间")}
                <tspan className="motion-stage-panel-note-inline">
                  {tt("（曲线越陡，说明单位时间蒸发越快。）")}
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

              <polyline points={graphGeometry.baselineFullPolyline} className="motion-stage-graph-line is-muted" />
              <polyline points={graphGeometry.baselinePlayedPolyline} className="motion-stage-graph-line" />
              <polyline points={graphGeometry.compareFullPolyline} className="motion-stage-graph-line is-secondary-muted" />
              <polyline points={graphGeometry.comparePlayedPolyline} className="motion-stage-graph-line is-secondary" />
              <line
                x1={graphGeometry.currentX}
                y1={graphGeometry.chartTop}
                x2={graphGeometry.currentX}
                y2={graphGeometry.chartBottom}
                className="motion-stage-guide-line is-chart"
              />
              <circle
                cx={graphGeometry.currentX}
                cy={graphGeometry.baselineCurrentY}
                r="7"
                className="motion-stage-graph-point"
              />
              <circle
                cx={graphGeometry.currentX}
                cy={graphGeometry.compareCurrentY}
                r="7"
                className="motion-stage-graph-point is-secondary"
              />

              <g className="evaporation-stage-legend">
                <circle cx={SVG_STAGE.graphPanelX + 36} cy={SVG_STAGE.graphPanelY + 62} r="5" className="evaporation-stage-legend-dot is-baseline" />
                <text x={SVG_STAGE.graphPanelX + 48} y={SVG_STAGE.graphPanelY + 66} className="motion-stage-graph-axis-label">
                  {baselineScenario.label}
                </text>
                <circle cx={SVG_STAGE.graphPanelX + 160} cy={SVG_STAGE.graphPanelY + 62} r="5" className="evaporation-stage-legend-dot is-compare" />
                <text x={SVG_STAGE.graphPanelX + 172} y={SVG_STAGE.graphPanelY + 66} className="motion-stage-graph-axis-label">
                  {compareScenario.label}
                </text>
              </g>

              <g transform={`translate(${SVG_STAGE.graphPanelX + 722}, ${SVG_STAGE.graphPanelY + 62})`}>
                {factorSummaryItems.map((item, index) => (
                  <g key={item.label} transform={`translate(0, ${index * 38})`}>
                    <text x="0" y="0" className="evaporation-stage-summary-label">
                      {item.label}
                    </text>
                    <text x="0" y="18" className="evaporation-stage-summary-value">
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
    setCurrentTimeHours(0);
  }

  function applyFactor(factor: StudyFactor) {
    if (factor === activeFactor) {
      return;
    }

    clearObservationTimer(timerRef.current);
    timerRef.current = null;
    setObservationState("idle");
    setCurrentTimeHours(0);
    setActiveFactor(factor);

    const preset = FACTOR_PRESETS[factor];
    if (factor === "temperature") {
      setComparedTemperatureC(preset.defaultValue);
      return;
    }

    if (factor === "area") {
      setComparedAreaCm2(preset.defaultValue);
      return;
    }

    setComparedWindMs(preset.defaultValue);
  }

  function startObservation() {
    clearObservationTimer(timerRef.current);
    timerRef.current = null;
    setObservationState("observing");
    setCurrentTimeHours(0);

    let elapsedMs = 0;
    timerRef.current = globalThis.setInterval(() => {
      elapsedMs = Math.min(elapsedMs + OBSERVATION_TICK_MS, OBSERVATION_DURATION_MS);
      const nextProgress =
        OBSERVATION_DURATION_MS <= 0 ? 1 : elapsedMs / OBSERVATION_DURATION_MS;
      setCurrentTimeHours(OBSERVATION_WINDOW_HOURS * nextProgress);

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
      [activeFactor]: {
        key: activeFactor,
        value: buildRecordValue({
          factor: activeFactor,
          baselineScenario,
          compareScenario,
          isZh,
        }),
        note: buildRecordNote({
          factor: activeFactor,
          baselineScenario,
          compareScenario,
          isZh,
        }),
      },
    };

    setRecords(nextRecords);

    const nextFactor = STEP_SEQUENCE.find((key) => !nextRecords[key]);
    if (nextFactor) {
      applyFactor(nextFactor);
    }
  }

  function resetLab() {
    clearObservationTimer(timerRef.current);
    timerRef.current = null;
    setActiveFactor("temperature");
    setComparedTemperatureC(FACTOR_PRESETS.temperature.defaultValue);
    setComparedAreaCm2(FACTOR_PRESETS.area.defaultValue);
    setComparedWindMs(FACTOR_PRESETS.wind.defaultValue);
    setObservationState("idle");
    setCurrentTimeHours(0);
    setRecords({});
  }
}

function buildCompareScenario({
  activeFactor,
  comparedAreaCm2,
  comparedTemperatureC,
  comparedWindMs,
  isZh,
}: {
  activeFactor: StudyFactor;
  comparedAreaCm2: number;
  comparedTemperatureC: number;
  comparedWindMs: number;
  isZh: boolean;
}) {
  if (activeFactor === "temperature") {
    return buildScenario({
      label: isZh ? "升温组" : "Heated",
      shortLabel: isZh ? "升温" : "Heat",
      temperatureC: comparedTemperatureC,
      areaCm2: BASELINE_AREA_CM2,
      windMs: BASELINE_WIND_MS,
    });
  }

  if (activeFactor === "area") {
    return buildScenario({
      label: isZh ? "摊开组" : "Wide tray",
      shortLabel: isZh ? "摊开" : "Wide",
      temperatureC: BASELINE_TEMPERATURE_C,
      areaCm2: comparedAreaCm2,
      windMs: BASELINE_WIND_MS,
    });
  }

  return buildScenario({
    label: isZh ? "有风组" : "Fan on",
    shortLabel: isZh ? "有风" : "Wind",
    temperatureC: BASELINE_TEMPERATURE_C,
    areaCm2: BASELINE_AREA_CM2,
    windMs: comparedWindMs,
  });
}

function buildScenario({
  label,
  shortLabel,
  temperatureC,
  areaCm2,
  windMs,
}: {
  label: string;
  shortLabel: string;
  temperatureC: number;
  areaCm2: number;
  windMs: number;
}): ExperimentScenario {
  const rateMlPerHour = calculateEvaporationRateMlPerHour({
    temperatureC,
    areaCm2,
    windMs,
  });

  return {
    label,
    shortLabel,
    temperatureC,
    areaCm2,
    windMs,
    rateMlPerHour,
    totalEvaporationMl: Math.min(INITIAL_WATER_ML * 0.82, rateMlPerHour * OBSERVATION_WINDOW_HOURS),
  };
}

function calculateEvaporationRateMlPerHour({
  temperatureC,
  areaCm2,
  windMs,
}: {
  temperatureC: number;
  areaCm2: number;
  windMs: number;
}) {
  const baseRate = 1.875;
  const temperatureFactor = Math.max(0.45, 1 + 0.03 * (temperatureC - BASELINE_TEMPERATURE_C));
  const areaFactor = Math.pow(Math.max(0.35, areaCm2 / BASELINE_AREA_CM2), 0.8);
  const windFactor = 1 + Math.max(0, windMs) * 0.5;
  return Number((baseRate * temperatureFactor * areaFactor * windFactor).toFixed(2));
}

function resolveEvaporationPoint(scenario: ExperimentScenario, timeHours: number): EvaporationPoint {
  const safeTimeHours = Math.max(0, Math.min(timeHours, OBSERVATION_WINDOW_HOURS));
  const ratio = OBSERVATION_WINDOW_HOURS <= 0 ? 0 : safeTimeHours / OBSERVATION_WINDOW_HOURS;
  const curveFactor = 0.92 + 0.08 * ratio;
  const evaporatedMl = Math.min(
    scenario.totalEvaporationMl,
    scenario.rateMlPerHour * safeTimeHours * curveFactor,
  );
  const remainingMl = Math.max(0, INITIAL_WATER_ML - evaporatedMl);

  return {
    timeHours: safeTimeHours,
    evaporatedMl,
    remainingMl,
    rateMlPerHour: scenario.rateMlPerHour,
  };
}

function buildSeries(scenario: ExperimentScenario) {
  return Array.from({ length: GRAPH_SAMPLE_COUNT }, (_, index) => {
    const ratio = index / (GRAPH_SAMPLE_COUNT - 1);
    return resolveEvaporationPoint(scenario, OBSERVATION_WINDOW_HOURS * ratio);
  });
}

function buildEvaporationGraph({
  baselineSeries,
  compareSeries,
  currentTimeHours,
  x,
  y,
  width,
  height,
  maxEvaporationMl,
}: {
  baselineSeries: EvaporationPoint[];
  compareSeries: EvaporationPoint[];
  currentTimeHours: number;
  x: number;
  y: number;
  width: number;
  height: number;
  maxEvaporationMl: number;
}) {
  const padding = { top: 54, right: 28, bottom: 38, left: 56 };
  const chartLeft = x + padding.left;
  const chartRight = x + width - padding.right;
  const chartTop = y + padding.top;
  const chartBottom = y + height - padding.bottom;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  const mapTime = (value: number) =>
    chartLeft + chartWidth * (OBSERVATION_WINDOW_HOURS <= 0 ? 0 : value / OBSERVATION_WINDOW_HOURS);
  const mapEvaporation = (value: number) =>
    chartBottom - chartHeight * (maxEvaporationMl <= 0 ? 0 : value / maxEvaporationMl);

  const toPolyline = (series: EvaporationPoint[]) =>
    series.map((point) => `${mapTime(point.timeHours)},${mapEvaporation(point.evaporatedMl)}`).join(" ");

  const buildPlayedPolyline = (series: EvaporationPoint[]) => {
    const played = series.filter((point) => point.timeHours <= currentTimeHours + 0.0001);
    const safeSeries = played.length > 0 ? played : [series[0]];
    return safeSeries.map((point) => `${mapTime(point.timeHours)},${mapEvaporation(point.evaporatedMl)}`).join(" ");
  };

  const baselineCurrent = findCurrentPoint(baselineSeries, currentTimeHours);
  const compareCurrent = findCurrentPoint(compareSeries, currentTimeHours);

  return {
    chartTop,
    chartBottom,
    currentX: mapTime(currentTimeHours),
    baselineCurrentY: mapEvaporation(baselineCurrent.evaporatedMl),
    compareCurrentY: mapEvaporation(compareCurrent.evaporatedMl),
    baselineFullPolyline: toPolyline(baselineSeries),
    baselinePlayedPolyline: buildPlayedPolyline(baselineSeries),
    compareFullPolyline: toPolyline(compareSeries),
    comparePlayedPolyline: buildPlayedPolyline(compareSeries),
    yTicks: Array.from({ length: 5 }).map((_, index) => {
      const ratio = index / 4;
      const value = maxEvaporationMl * (1 - ratio);
      const lineY = chartTop + chartHeight * ratio;
      return {
        key: `y-${index}`,
        x1: chartLeft,
        x2: chartRight,
        y: lineY,
        labelX: x + 12,
        label: formatMl(value),
      };
    }),
    xTicks: Array.from({ length: 5 }).map((_, index) => {
      const ratio = index / 4;
      const lineX = chartLeft + chartWidth * ratio;
      const value = OBSERVATION_WINDOW_HOURS * ratio;
      return {
        key: `x-${index}`,
        x: lineX,
        y1: chartTop,
        y2: chartBottom,
        labelY: y + height - 10,
        label: `${formatHours(value)}`,
      };
    }),
  };
}

function findCurrentPoint(series: EvaporationPoint[], currentTimeHours: number) {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const point = series[index];
    if (point && point.timeHours <= currentTimeHours + 0.0001) {
      return point;
    }
  }

  return series[0];
}

function describeObservation({
  factor,
  baselineScenario,
  compareScenario,
  baselinePoint,
  comparePoint,
  isZh,
}: {
  factor: StudyFactor;
  baselineScenario: ExperimentScenario;
  compareScenario: ExperimentScenario;
  baselinePoint: EvaporationPoint;
  comparePoint: EvaporationPoint;
  isZh: boolean;
}) {
  const delta = comparePoint.evaporatedMl - baselinePoint.evaporatedMl;

  if (factor === "temperature") {
    return isZh
      ? `保持表面积 ${formatArea(baselineScenario.areaCm2)}、风速 ${formatWind(baselineScenario.windMs)} 不变时，${compareScenario.temperatureC} ℃ 组在 ${formatHours(comparePoint.timeHours)} 内比 ${baselineScenario.temperatureC} ℃ 组多蒸发 ${formatMl(delta)}。`
      : `With the same area and airflow, the ${compareScenario.temperatureC}°C group evaporates ${formatMl(delta)} more within ${formatHours(comparePoint.timeHours)}.`;
  }

  if (factor === "area") {
    return isZh
      ? `保持温度 ${baselineScenario.temperatureC} ℃、风速 ${formatWind(baselineScenario.windMs)} 不变时，${formatArea(compareScenario.areaCm2)} 组在 ${formatHours(comparePoint.timeHours)} 内比 ${formatArea(baselineScenario.areaCm2)} 组多蒸发 ${formatMl(delta)}。`
      : `With the same temperature and airflow, the ${formatArea(compareScenario.areaCm2)} group evaporates ${formatMl(delta)} more within ${formatHours(comparePoint.timeHours)}.`;
  }

  return isZh
    ? `保持温度 ${baselineScenario.temperatureC} ℃、表面积 ${formatArea(baselineScenario.areaCm2)} 不变时，${formatWind(compareScenario.windMs)} 组在 ${formatHours(comparePoint.timeHours)} 内比无风组多蒸发 ${formatMl(delta)}。`
    : `With the same temperature and area, the ${formatWind(compareScenario.windMs)} group evaporates ${formatMl(delta)} more than the still-air group.`;
}

function buildRecordValue({
  factor,
  baselineScenario,
  compareScenario,
  isZh,
}: {
  factor: StudyFactor;
  baselineScenario: ExperimentScenario;
  compareScenario: ExperimentScenario;
  isZh: boolean;
}) {
  if (factor === "temperature") {
    return isZh
      ? `${baselineScenario.temperatureC} ℃ vs ${compareScenario.temperatureC} ℃ · 4 h: ${formatMl(baselineScenario.totalEvaporationMl)} vs ${formatMl(compareScenario.totalEvaporationMl)}`
      : `${baselineScenario.temperatureC}°C vs ${compareScenario.temperatureC}°C · 4h: ${formatMl(baselineScenario.totalEvaporationMl)} vs ${formatMl(compareScenario.totalEvaporationMl)}`;
  }

  if (factor === "area") {
    return isZh
      ? `${formatArea(baselineScenario.areaCm2)} vs ${formatArea(compareScenario.areaCm2)} · 4 h: ${formatMl(baselineScenario.totalEvaporationMl)} vs ${formatMl(compareScenario.totalEvaporationMl)}`
      : `${formatArea(baselineScenario.areaCm2)} vs ${formatArea(compareScenario.areaCm2)} · 4h: ${formatMl(baselineScenario.totalEvaporationMl)} vs ${formatMl(compareScenario.totalEvaporationMl)}`;
  }

  return isZh
    ? `${formatWind(baselineScenario.windMs)} vs ${formatWind(compareScenario.windMs)} · 4 h: ${formatMl(baselineScenario.totalEvaporationMl)} vs ${formatMl(compareScenario.totalEvaporationMl)}`
    : `${formatWind(baselineScenario.windMs)} vs ${formatWind(compareScenario.windMs)} · 4h: ${formatMl(baselineScenario.totalEvaporationMl)} vs ${formatMl(compareScenario.totalEvaporationMl)}`;
}

function buildRecordNote({
  factor,
  baselineScenario,
  compareScenario,
  isZh,
}: {
  factor: StudyFactor;
  baselineScenario: ExperimentScenario;
  compareScenario: ExperimentScenario;
  isZh: boolean;
}) {
  if (factor === "temperature") {
    return isZh
      ? `只改变温度，其余条件固定；高温组蒸发速率约为基准组的 ${(compareScenario.rateMlPerHour / baselineScenario.rateMlPerHour).toFixed(2)} 倍。`
      : `Only temperature changes; the hotter group evaporates ${(compareScenario.rateMlPerHour / baselineScenario.rateMlPerHour).toFixed(2)}× faster.`;
  }

  if (factor === "area") {
    return isZh
      ? `只改变表面积，其余条件固定；表面积更大的液面暴露分子更多，所以蒸发更快。`
      : `Only surface area changes; the wider surface exposes more molecules and evaporates faster.`;
  }

  return isZh
    ? `只改变风速，其余条件固定；风越大，液面附近的水蒸气被带走得越快。`
    : `Only airflow changes; stronger wind removes vapor near the surface faster.`;
}

function getCentralStageCopy(factor: StudyFactor, isZh: boolean) {
  if (factor === "temperature") {
    return isZh ? "只改温度：表面积与风速锁定" : "Only temperature changes";
  }

  if (factor === "area") {
    return isZh ? "只改表面积：温度与风速锁定" : "Only area changes";
  }

  return isZh ? "只改风速：温度与表面积锁定" : "Only airflow changes";
}

function formatMl(value: number) {
  const rounded = Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2);
  const normalized = rounded.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  return `${normalized} mL`;
}

function formatHours(value: number) {
  const normalized = value.toFixed(1).replace(/\.0$/, "");
  return `${normalized} h`;
}

function formatArea(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} cm²`;
}

function formatWind(value: number) {
  const normalized = value.toFixed(1).replace(/\.0$/, "");
  return `${normalized} m/s`;
}

function clearObservationTimer(timerId: TimerId | null) {
  if (timerId !== null) {
    globalThis.clearInterval(timerId);
  }
}

function EvaporationVessel({
  scenario,
  point,
  centerX,
  baseY,
  label,
  tone,
}: {
  scenario: ExperimentScenario;
  point: EvaporationPoint;
  centerX: number;
  baseY: number;
  label: string;
  tone: "baseline" | "compare";
}) {
  const width = 88 + Math.min(104, (scenario.areaCm2 - BASELINE_AREA_CM2) * 0.74);
  const bodyHeight = scenario.areaCm2 > 90 ? 126 : 178;
  const lipInset = scenario.areaCm2 > 90 ? 14 : 22;
  const liquidPadding = 10;
  const liquidRatio = point.remainingMl / INITIAL_WATER_ML;
  const liquidHeight = Math.max(24, (bodyHeight - liquidPadding * 2) * liquidRatio);
  const topY = baseY - bodyHeight;
  const leftX = centerX - width / 2;
  const liquidTopY = baseY - liquidPadding - liquidHeight;
  const vaporCount = Math.max(4, Math.round(3 + scenario.rateMlPerHour * 0.8));
  const showFan = scenario.windMs > 0.4;
  const showHeatWave = scenario.temperatureC > 30;

  return (
    <g className={["evaporation-stage-vessel", tone === "compare" ? "is-compare" : "is-baseline"].join(" ")}>
      <ellipse cx={centerX} cy={baseY + 10} rx={width / 2 + 10} ry="9" className="evaporation-stage-vessel-shadow" />
      <path
        d={`M ${leftX + lipInset} ${topY}
          L ${leftX} ${baseY}
          L ${leftX + width} ${baseY}
          L ${leftX + width - lipInset} ${topY} Z`}
        className="evaporation-stage-vessel-body"
      />
      <path
        d={`M ${leftX + lipInset + 4} ${liquidTopY}
          L ${leftX + 8} ${baseY - 4}
          L ${leftX + width - 8} ${baseY - 4}
          L ${leftX + width - lipInset - 4} ${liquidTopY} Z`}
        className="evaporation-stage-liquid-body"
      />
      <ellipse cx={centerX} cy={liquidTopY} rx={width / 2 - lipInset} ry="9" className="evaporation-stage-liquid-surface" />
      <ellipse cx={centerX} cy={topY} rx={width / 2 - lipInset + 6} ry="10" className="evaporation-stage-vessel-lip" />

      {Array.from({ length: vaporCount }).map((_, index) => {
        const column = index % 4;
        const row = Math.floor(index / 4);
        const vaporX = centerX - 28 + column * 18 + (row % 2 === 0 ? 0 : 6);
        const vaporY = liquidTopY - 18 - row * 20 - (column % 2 === 0 ? 6 : 0);
        const radius = 4 + (index % 3);
        return (
          <circle
            key={`vapor-${index}`}
            cx={vaporX}
            cy={vaporY}
            r={radius}
            className={showFan ? "evaporation-stage-vapor is-drifting" : "evaporation-stage-vapor"}
          />
        );
      })}

      {showHeatWave ? (
        <g className="evaporation-stage-heat-wave">
          {Array.from({ length: 3 }).map((_, index) => {
            const startX = centerX - 18 + index * 18;
            return (
              <path
                key={`heat-${index}`}
                d={`M ${startX} ${topY - 20} C ${startX - 8} ${topY - 34}, ${startX + 8} ${topY - 42}, ${startX} ${topY - 56}`}
              />
            );
          })}
        </g>
      ) : null}

      {showFan ? (
        <g className="evaporation-stage-fan-group">
          <circle cx={leftX - 34} cy={topY + bodyHeight / 2} r="18" className="evaporation-stage-fan-body" />
          <path d={`M ${leftX - 34} ${topY + bodyHeight / 2 - 12} L ${leftX - 26} ${topY + bodyHeight / 2} L ${leftX - 34} ${topY + bodyHeight / 2 + 12} L ${leftX - 42} ${topY + bodyHeight / 2} Z`} className="evaporation-stage-fan-blade" />
          <path d={`M ${leftX - 8} ${topY + bodyHeight / 2 - 12} C ${leftX + 12} ${topY + bodyHeight / 2 - 16}, ${leftX + 22} ${topY + bodyHeight / 2 - 16}, ${leftX + 34} ${topY + bodyHeight / 2 - 12}`} className="evaporation-stage-airflow-line" />
          <path d={`M ${leftX - 6} ${topY + bodyHeight / 2} C ${leftX + 14} ${topY + bodyHeight / 2 - 4}, ${leftX + 24} ${topY + bodyHeight / 2 - 4}, ${leftX + 38} ${topY + bodyHeight / 2}`} className="evaporation-stage-airflow-line" />
          <path d={`M ${leftX - 8} ${topY + bodyHeight / 2 + 12} C ${leftX + 12} ${topY + bodyHeight / 2 + 8}, ${leftX + 22} ${topY + bodyHeight / 2 + 8}, ${leftX + 34} ${topY + bodyHeight / 2 + 12}`} className="evaporation-stage-airflow-line" />
        </g>
      ) : null}

      <text x={centerX} y={topY - 76} textAnchor="middle" className="evaporation-stage-vessel-title">
        {label}
      </text>
      <text x={centerX} y={topY - 54} textAnchor="middle" className="evaporation-stage-vessel-note">
        {`${scenario.temperatureC} °C · ${formatArea(scenario.areaCm2)} · ${formatWind(scenario.windMs)}`}
      </text>
      <text x={centerX} y={topY - 32} textAnchor="middle" className="evaporation-stage-vessel-note">
        {`r = ${scenario.rateMlPerHour.toFixed(2)} mL/h`}
      </text>
      <text x={centerX} y={baseY + 38} textAnchor="middle" className="evaporation-stage-vessel-value">
        {`Δm = ${formatMl(point.evaporatedMl)}`}
      </text>
      <text x={centerX} y={baseY + 58} textAnchor="middle" className="evaporation-stage-vessel-copy">
        {`V = ${formatMl(point.remainingMl)}`}
      </text>
    </g>
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
