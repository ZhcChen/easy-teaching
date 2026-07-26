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
import { StatusPill } from "./status-pill";

type PressureFactorsLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type StudyMode = "pressure" | "area";
type AreaPreset = "wide" | "narrow";
type ObservationState = "idle" | "observing" | "stable";

type PressureRecord = {
  groupKey: string;
  label: string;
  note: string;
  pressurePa: number;
  deformationMm: number;
};

type RecordBuckets = {
  pressure: Record<string, PressureRecord>;
  area: Record<string, PressureRecord>;
};

type AreaMeta = {
  key: AreaPreset;
  label: string;
  shortLabel: string;
  areaCm2: number;
  contactWidth: number;
  supportTone: "wide" | "legs";
  copy: string;
};

type ObservationTimer = ReturnType<typeof setTimeout>;

const PANEL_COLLAPSED_STORAGE_KEY = "easy-teaching.pressure-factors.panel-collapsed";
const OBSERVATION_DURATION_MS = 520;
const DEFAULT_FORCE = 5;
const PRESSURE_FORCE_OPTIONS = [5, 10, 15] as const;
const AREA_SEQUENCE: AreaPreset[] = ["wide", "narrow"];

const AREA_PRESETS: Record<AreaPreset, AreaMeta> = {
  wide: {
    key: "wide",
    label: "小桌正放",
    shortLabel: "正放",
    areaCm2: 25,
    contactWidth: 180,
    supportTone: "wide",
    copy: "桌面整体接触海绵，受力面积较大。",
  },
  narrow: {
    key: "narrow",
    label: "小桌倒放",
    shortLabel: "倒放",
    areaCm2: 4,
    contactWidth: 64,
    supportTone: "legs",
    copy: "桌腿接触海绵，受力面积显著减小。",
  },
};

export function PressureFactorsLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: PressureFactorsLabProps) {
  const { isZh, tt } = useLocale();
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  const [studyMode, setStudyMode] = useState<StudyMode>("pressure");
  const [force, setForce] = useState<number>(DEFAULT_FORCE);
  const [areaPreset, setAreaPreset] = useState<AreaPreset>("wide");
  const [observationState, setObservationState] = useState<ObservationState>("idle");
  const [isPressed, setIsPressed] = useState(false);
  const [recordsByFactor, setRecordsByFactor] = useState<RecordBuckets>({
    pressure: {},
    area: {},
  });
  const observationTimerRef = useRef<ObservationTimer | null>(null);

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
      clearObservationTimer(observationTimerRef.current);
    };
  }, []);

  const areaMeta = AREA_PRESETS[areaPreset];
  const theoreticalPressurePa = Math.round(force / (areaMeta.areaCm2 / 10000));
  const deformationMm = calculateDeformationMm(theoreticalPressurePa);
  const displayedPressurePa = isPressed ? theoreticalPressurePa : 0;
  const displayedDeformationMm = isPressed ? deformationMm : 0;
  const activeGroupKey = studyMode === "pressure" ? `force-${force}` : areaPreset;
  const currentGroupAlreadyRecorded = Boolean(recordsByFactor[studyMode][activeGroupKey]);

  const pressureRecordedCount = Object.keys(recordsByFactor.pressure).length;
  const areaRecordedCount = Object.keys(recordsByFactor.area).length;

  const stageStateMeta = useMemo(() => {
    if (observationState === "stable") {
      return {
        label: isZh ? "读数稳定" : "Stable reading",
        tone: "balanced" as const,
        copy: isZh
          ? "海绵形变已经稳定，现在可以记录本组数据。"
          : "The deformation has settled. You can now record this run.",
      };
    }

    if (observationState === "observing") {
      return {
        label: isZh ? "观察中" : "Observing",
        tone: "active" as const,
        copy: isZh
          ? "小桌正在压向海绵，请观察形变深浅和压强变化。"
          : "The desk is pressing into the sponge. Observe depth and pressure change.",
      };
    }

    return {
      label: isZh ? "待观察" : "Ready",
      tone: "warning" as const,
      copy: isZh
        ? "先开始观察，再读取海绵形变和压强。"
        : "Start the observation before reading deformation and pressure.",
    };
  }, [isZh, observationState]);

  const studyModeLabel = studyMode === "pressure"
    ? (isZh ? "研究压力" : "Study Force")
    : (isZh ? "研究受力面积" : "Study Area");

  const currentTaskSummary = studyMode === "pressure"
    ? (isZh
      ? "保持受力面积不变，对比不同压力下的压强和海绵形变。"
      : "Keep the area fixed and compare pressure and deformation under different loads.")
    : (isZh
      ? "保持压力不变，对比不同受力面积下的压强和海绵形变。"
      : "Keep the load fixed and compare pressure and deformation under different contact areas.");

  const currentModeNote = studyMode === "pressure"
    ? (isZh
      ? `课堂记录使用 ${formatArea(areaMeta.areaCm2, true)} 的固定面积。`
      : `Classroom records use a fixed area of ${formatArea(areaMeta.areaCm2, false)}.`)
    : (isZh
      ? "课堂记录固定使用 5 N 的压力，只比较受力面积变化。"
      : "Classroom records fix the load at 5 N and compare only the contact area.");

  const currentGroupLabel = studyMode === "pressure"
    ? (isZh ? `压力 ${force} N` : `Load ${force} N`)
    : tt(areaMeta.label);

  const currentObservationHint = getCurrentObservationHint({
    studyMode,
    isZh,
    force,
    areaMeta,
    pressureRecordedCount,
    areaRecordedCount,
  });

  const currentComparisonRows = buildComparisonRows({
    studyMode,
    recordsByFactor,
    isZh,
    activeGroupKey,
  });

  const recordGroups = buildRecordGroups({
    isZh,
    studyMode,
    force,
    areaPreset,
    recordsByFactor,
  });

  const isRecordEnabled = observationState === "stable";
  const recordButtonLabel = currentGroupAlreadyRecorded
    ? (isZh ? "更新本组" : "Update current run")
    : (isZh ? "记录本组" : "Record current run");
  const observeButtonLabel = observationState === "observing"
    ? (isZh ? "观察中…" : "Observing…")
    : observationState === "stable"
      ? (isZh ? "重新观察" : "Replay observation")
      : (isZh ? "开始观察" : "Start observation");

  function invalidateObservation() {
    clearObservationTimer(observationTimerRef.current);
    observationTimerRef.current = null;
    setObservationState("idle");
    setIsPressed(false);
  }

  function applyStudyMode(nextMode: StudyMode) {
    if (nextMode === studyMode) {
      return;
    }

    clearObservationTimer(observationTimerRef.current);
    observationTimerRef.current = null;

    setStudyMode(nextMode);
    setObservationState("idle");
    setIsPressed(false);

    if (nextMode === "pressure") {
      setAreaPreset("wide");
      if (!PRESSURE_FORCE_OPTIONS.includes(force as (typeof PRESSURE_FORCE_OPTIONS)[number])) {
        setForce(DEFAULT_FORCE);
      }
      return;
    }

    setForce(DEFAULT_FORCE);
    setAreaPreset("wide");
  }

  function startObservation() {
    clearObservationTimer(observationTimerRef.current);
    observationTimerRef.current = null;

    setIsPressed(true);
    setObservationState("observing");
    observationTimerRef.current = globalThis.setTimeout(() => {
      setObservationState("stable");
      observationTimerRef.current = null;
    }, OBSERVATION_DURATION_MS);
  }

  function recordCurrentObservation() {
    if (!isRecordEnabled) {
      return;
    }

    const currentRecord = buildCurrentRecord({
      studyMode,
      force,
      areaMeta,
      pressurePa: theoreticalPressurePa,
      deformationMm,
      isZh,
    });

    const nextBuckets: RecordBuckets = {
      pressure: { ...recordsByFactor.pressure },
      area: { ...recordsByFactor.area },
    };

    nextBuckets[studyMode][currentRecord.groupKey] = currentRecord;
    setRecordsByFactor(nextBuckets);

    if (studyMode === "pressure") {
      const nextForce = getNextPendingForce(nextBuckets.pressure);
      if (nextForce !== null) {
        setForce(nextForce);
        invalidateObservation();
      }
      return;
    }

    const nextArea = getNextPendingArea(nextBuckets.area);
    if (nextArea !== null) {
      setAreaPreset(nextArea);
      invalidateObservation();
    }
  }

  function resetLab() {
    clearObservationTimer(observationTimerRef.current);
    observationTimerRef.current = null;
    setStudyMode("pressure");
    setForce(DEFAULT_FORCE);
    setAreaPreset("wide");
    setObservationState("idle");
    setIsPressed(false);
    setRecordsByFactor({
      pressure: {},
      area: {},
    });
  }

  return (
    <section ref={fullscreenRef} className="visual-shell force-lab-shell pressure-lab-shell">
      <div
        className={
          isControlPanelCollapsed
            ? "force-lab-layout pressure-lab-layout is-collapsed"
            : "force-lab-layout pressure-lab-layout"
        }
      >
        <aside
          className={
            isControlPanelCollapsed
              ? "force-control-panel pressure-control-panel is-collapsed"
              : "force-control-panel pressure-control-panel"
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
                  <h4 className="force-control-title">{tt(topic.title)}</h4>
                  <p className="force-control-copy">
                    {isZh
                      ? "用同一块海绵比较压力和受力面积，理解压强大小的变化。"
                      : "Use the same sponge to compare load and area, then understand pressure."}
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

              <div className="force-control-scroll pressure-control-scroll">
                <ControlPanelSection
                  title={isZh ? "课堂主流程" : "Classroom Flow"}
                  hint={isZh ? "先选变量，再观察并记录" : "Pick one variable, observe, then record"}
                  accent
                >
                  <ControlChipGroup
                    items={[
                      {
                        key: "pressure",
                        label: isZh ? "压力" : "Load",
                        active: studyMode === "pressure",
                        onClick: () => applyStudyMode("pressure"),
                      },
                      {
                        key: "area",
                        label: isZh ? "受力面积" : "Area",
                        active: studyMode === "area",
                        onClick: () => applyStudyMode("area"),
                      },
                    ]}
                    columns={2}
                    size="dense"
                  />

                  <ControlStatusBar
                    items={[
                      <StatusPill key="mode" tone="active">{studyModeLabel}</StatusPill>,
                      <StatusPill key="group">{currentGroupLabel}</StatusPill>,
                    ]}
                    status={<StatusPill tone={stageStateMeta.tone}>{stageStateMeta.label}</StatusPill>}
                  />

                  <p className="force-inline-copy">
                    {currentTaskSummary}
                    {isZh ? " " : " "}
                    {currentModeNote}
                  </p>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "实验参数" : "Experiment Variables"}
                  hint={isZh ? "课堂记录只改变一个量" : "Change only one classroom variable"}
                >
                  <ControlRange
                    id="pressure-force"
                    label={isZh ? "当前压力" : "Current Load"}
                    value={force}
                    min={DEFAULT_FORCE}
                    max={15}
                    step={5}
                    unit="N"
                    editable
                    disabled={studyMode !== "pressure"}
                    onChange={(nextValue) => {
                      setForce(nextValue);
                      invalidateObservation();
                    }}
                  />

                  <div className="pressure-inline-lock-grid">
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "受力面积" : "Contact Area"}</span>
                      <strong className="force-insight-value">{formatArea(areaMeta.areaCm2, isZh)}</strong>
                    </article>
                    <article className="force-insight-card">
                      <span className="force-insight-label">{isZh ? "桌面摆放" : "Placement"}</span>
                      <strong className="force-insight-value">{tt(areaMeta.shortLabel)}</strong>
                    </article>
                  </div>

                  <ControlChipGroup
                    items={AREA_SEQUENCE.map((item) => ({
                      key: item,
                      label: tt(AREA_PRESETS[item].label),
                      active: areaPreset === item,
                      disabled: studyMode !== "area",
                      onClick: () => {
                        setAreaPreset(item);
                        invalidateObservation();
                      },
                    }))}
                    columns={2}
                    size="dense"
                  />

                  <p className="force-inline-copy">{tt(areaMeta.copy)}</p>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "操作与记录" : "Observe & Record"}
                  hint={isZh ? "先观察，再记录本组" : "Observe first, then record"}
                >
                  <div className="force-action-grid">
                    <ControlButton
                      variant="primary"
                      disabled={observationState === "observing"}
                      onClick={startObservation}
                    >
                      {observeButtonLabel}
                    </ControlButton>
                    <ControlButton
                      variant="ghost"
                      disabled={!isRecordEnabled}
                      onClick={recordCurrentObservation}
                    >
                      {recordButtonLabel}
                    </ControlButton>
                    <ControlButton
                      variant="ghost"
                      onClick={resetLab}
                    >
                      {tt("重置")}
                    </ControlButton>
                  </div>

                  <p className="force-inline-copy">{currentObservationHint}</p>

                  <BasicForceRecordTable
                    groups={recordGroups}
                    emptyTitle={isZh ? "先完成第一组观察" : "Finish the first observation"}
                    emptyCopy={
                      isZh
                        ? "课堂记录会保留待测组、已测组和最终结论，避免只看到结果。"
                        : "The worksheet keeps pending groups, recorded groups, and the final conclusion."
                    }
                    pendingCopy={isZh ? "待测" : "Pending"}
                  />
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "实验器材" : "Equipment"}
                  hint={isZh ? "当前舞台使用的课堂器材" : "Current classroom setup"}
                >
                  <div className="force-support-chip-list">
                    {[isZh ? "小桌" : "Desk", isZh ? "海绵" : "Sponge", isZh ? "砝码" : "Weights", isZh ? "刻度尺" : "Ruler"].map((item) => (
                      <span key={item} className="force-support-chip">{item}</span>
                    ))}
                  </div>
                </ControlPanelSection>

                <ControlPanelSection
                  title={isZh ? "思考提示" : "Think Prompt"}
                  hint={isZh ? "帮助归纳结论" : "Guide the conclusion"}
                >
                  <ul className="force-support-question-list">
                    <li>
                      {isZh
                        ? "为什么小桌倒放后，海绵形变会明显加深？"
                        : "Why does the sponge deform more when the desk is upside down?"}
                    </li>
                    <li>
                      {isZh
                        ? "保持面积不变时，压力增大一倍，压强会怎样变化？"
                        : "If the area stays fixed and the load doubles, how does pressure change?"}
                    </li>
                    <li>
                      {isZh
                        ? "书包宽背带、滑雪板和图钉分别利用了什么压强规律？"
                        : "What pressure idea is used by wide straps, skis, and thumbtacks?"}
                    </li>
                  </ul>
                </ControlPanelSection>
              </div>
            </>
          )}
        </aside>

        <div className="force-lab-main pressure-lab-main">
          <div className="force-toolbar">
            <div className="force-toolbar-status">
              <StatusPill tone="active">{studyModeLabel}</StatusPill>
              <StatusPill tone={stageStateMeta.tone}>{stageStateMeta.label}</StatusPill>
            </div>
            <div className="force-toolbar-actions">
              <FullscreenToggleButton
                isFullscreen={isFullscreen}
                onToggle={onToggleFullscreen}
                variant="compact"
              />
            </div>
          </div>

          <div className="visual-canvas force-stage-canvas pressure-stage-canvas is-2d-mode">
            <div className="visual-grid-layer" />
            <div className="visual-glow visual-glow-a" />
            <div className="visual-glow visual-glow-b" />

            <div className="force-stage-overlay is-top-left">
              <div className="force-stage-hud-card">
                <div className="force-stage-hud-head">
                  <span className="force-stage-hud-title">
                    {isZh ? "当前观察任务" : "Current Observation"}
                  </span>
                  <StatusPill tone={stageStateMeta.tone}>{stageStateMeta.label}</StatusPill>
                </div>
                <p className="force-inline-copy pressure-stage-copy">{stageStateMeta.copy}</p>
                <div className="force-stage-chip-grid">
                  <span className="force-stage-chip">
                    {isZh ? `当前组：${currentGroupLabel}` : `Current: ${currentGroupLabel}`}
                  </span>
                  <span className="force-stage-chip">
                    {isZh
                      ? `受力面积：${formatArea(areaMeta.areaCm2, true)}`
                      : `Area: ${formatArea(areaMeta.areaCm2, false)}`}
                  </span>
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
                    <strong>{isZh ? `${force} N` : `${force} N`}</strong>
                    <span>{isZh ? "当前压力 F" : "Load F"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{formatArea(areaMeta.areaCm2, isZh)}</strong>
                    <span>{isZh ? "受力面积 S" : "Area S"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{formatPressure(displayedPressurePa, isZh)}</strong>
                    <span>{isZh ? "压强 P" : "Pressure P"}</span>
                  </article>
                  <article className="force-stage-result-pill">
                    <strong>{formatDeformation(displayedDeformationMm, isZh)}</strong>
                    <span>{isZh ? "海绵凹陷" : "Indentation"}</span>
                  </article>
                </div>
                <p className="pressure-stage-formula">
                  {isZh
                    ? `P = F / S = ${force} / ${formatArea(areaMeta.areaCm2, true)} ≈ ${theoreticalPressurePa} Pa`
                    : `P = F / S = ${force} / ${formatArea(areaMeta.areaCm2, false)} ≈ ${theoreticalPressurePa} Pa`}
                </p>
              </div>
            </div>

            <div className="force-stage-overlay is-bottom-right">
              <div className="force-stage-hud-card is-tight pressure-stage-comparison-card">
                <div className="force-stage-hud-head">
                  <span className="force-stage-hud-title">
                    {studyMode === "pressure"
                      ? (isZh ? "压力对照" : "Load Comparison")
                      : (isZh ? "面积对照" : "Area Comparison")}
                  </span>
                  <span className="force-stage-chip">
                    {studyMode === "pressure"
                      ? `${pressureRecordedCount} / 3`
                      : `${areaRecordedCount} / 2`}
                  </span>
                </div>
                <div className="pressure-stage-bar-list">
                  {currentComparisonRows.map((row) => (
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
              viewBox="0 0 960 660"
              className="pressure-stage-svg"
              aria-label={isZh ? "压强影响因素实验舞台" : "Pressure factors lab stage"}
            >
              <defs>
                <linearGradient id="pressure-sponge" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8dd9ff" />
                  <stop offset="100%" stopColor="#3c89d8" />
                </linearGradient>
                <linearGradient id="pressure-table" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f9b36b" />
                  <stop offset="100%" stopColor="#dd7b2c" />
                </linearGradient>
                <linearGradient id="pressure-weight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d9e5f6" />
                  <stop offset="100%" stopColor="#8ba1c4" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width="960" height="660" fill="transparent" />
              <line x1="120" y1="540" x2="840" y2="540" className="pressure-stage-surface-line" />

              <g>
                <rect x="210" y="420" width="540" height="110" rx="32" className="pressure-stage-sponge-body" />
                <rect x="210" y="420" width="540" height="110" rx="32" fill="url(#pressure-sponge)" opacity="0.92" />
                <rect
                  x={480 - areaMeta.contactWidth / 2}
                  y={420}
                  width={areaMeta.contactWidth}
                  height={Math.max(14, displayedDeformationMm * 1.55)}
                  rx="18"
                  className={isPressed ? "pressure-stage-compression-zone is-active" : "pressure-stage-compression-zone"}
                />
                <rect
                  x={480 - areaMeta.contactWidth / 2}
                  y={420}
                  width={areaMeta.contactWidth}
                  height="8"
                  rx="8"
                  className="pressure-stage-contact-highlight"
                />
              </g>

              <g
                className={isPressed ? "pressure-stage-object is-pressed" : "pressure-stage-object"}
                style={{ transform: `translateY(${isPressed ? displayedDeformationMm * 0.9 : 0}px)` }}
              >
                <rect x="360" y="260" width="240" height="22" rx="10" fill="url(#pressure-table)" className="pressure-stage-desk-top" />
                <rect x="390" y="282" width="180" height="54" rx="16" fill="url(#pressure-table)" className="pressure-stage-desk-body" />

                {areaMeta.supportTone === "wide" ? (
                  <rect x="400" y="336" width="160" height="30" rx="12" fill="url(#pressure-table)" className="pressure-stage-desk-base" />
                ) : (
                  <>
                    <rect x="412" y="332" width="26" height="78" rx="10" fill="url(#pressure-table)" className="pressure-stage-desk-leg" />
                    <rect x="522" y="332" width="26" height="78" rx="10" fill="url(#pressure-table)" className="pressure-stage-desk-leg" />
                  </>
                )}

                {Array.from({ length: Math.max(0, Math.round((force - DEFAULT_FORCE) / 5)) }).map((_, index) => (
                  <rect
                    key={index}
                    x={440 + index * 26}
                    y={226 - index * 14}
                    width="56"
                    height="22"
                    rx="8"
                    fill="url(#pressure-weight)"
                    className="pressure-stage-weight"
                  />
                ))}
              </g>

              <g
                className={isPressed ? "pressure-stage-force-arrow is-active" : "pressure-stage-force-arrow"}
                style={{ transform: `translateY(${isPressed ? displayedDeformationMm * 0.55 : 0}px)` }}
              >
                <line x1="480" y1="150" x2="480" y2="236" className="pressure-stage-arrow-line" />
                <path d="M480 248 L466 222 H494 Z" className="pressure-stage-arrow-head" />
                <text x="500" y="190" className="pressure-stage-label">{isZh ? `压力 ${force} N` : `Load ${force} N`}</text>
              </g>

              <line x1="284" y1="420" x2="284" y2={420 + displayedDeformationMm * 1.55} className="pressure-stage-measure-line" />
              <line x1="270" y1="420" x2="298" y2="420" className="pressure-stage-measure-cap" />
              <line
                x1="270"
                y1={420 + displayedDeformationMm * 1.55}
                x2="298"
                y2={420 + displayedDeformationMm * 1.55}
                className="pressure-stage-measure-cap"
              />
              <text x="238" y={444 + displayedDeformationMm * 0.75} className="pressure-stage-label">
                {formatDeformation(displayedDeformationMm, isZh)}
              </text>

              <text x="394" y="460" className="pressure-stage-label">
                {isZh ? `受力面积 ${formatArea(areaMeta.areaCm2, true)}` : `Area ${formatArea(areaMeta.areaCm2, false)}`}
              </text>
              <text x="660" y="456" className="pressure-stage-value">
                {isZh ? `压强 ${formatPressure(displayedPressurePa, true)}` : `Pressure ${formatPressure(displayedPressurePa, false)}`}
              </text>
              <text x="664" y="484" className="pressure-stage-label">
                {isZh ? "海绵形变越深，表示压力作用效果越明显。" : "Deeper deformation means a stronger pressure effect."}
              </text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

function buildCurrentRecord({
  studyMode,
  force,
  areaMeta,
  pressurePa,
  deformationMm,
  isZh,
}: {
  studyMode: StudyMode;
  force: number;
  areaMeta: AreaMeta;
  pressurePa: number;
  deformationMm: number;
  isZh: boolean;
}): PressureRecord {
  if (studyMode === "pressure") {
    return {
      groupKey: `force-${force}`,
      label: isZh ? `压力 ${force} N` : `Load ${force} N`,
      note: isZh
        ? `面积 ${formatArea(areaMeta.areaCm2, true)} · 海绵凹陷 ${formatDeformation(deformationMm, true)}`
        : `Area ${formatArea(areaMeta.areaCm2, false)} · Indentation ${formatDeformation(deformationMm, false)}`,
      pressurePa,
      deformationMm,
    };
  }

  return {
    groupKey: areaMeta.key,
    label: isZh ? areaMeta.label : (areaMeta.key === "wide" ? "Desk flat" : "Desk upside down"),
    note: isZh
      ? `压力 ${force} N · 海绵凹陷 ${formatDeformation(deformationMm, true)}`
      : `Load ${force} N · Indentation ${formatDeformation(deformationMm, false)}`,
    pressurePa,
    deformationMm,
  };
}

function buildRecordGroups({
  isZh,
  studyMode,
  force,
  areaPreset,
  recordsByFactor,
}: {
  isZh: boolean;
  studyMode: StudyMode;
  force: number;
  areaPreset: AreaPreset;
  recordsByFactor: RecordBuckets;
}) {
  const pressureRows = PRESSURE_FORCE_OPTIONS.map((value) => {
    const existing = recordsByFactor.pressure[`force-${value}`];
    return {
      key: `force-${value}`,
      label: isZh ? `压力 ${value} N` : `Load ${value} N`,
      value: existing ? formatPressure(existing.pressurePa, isZh) : "",
      note: existing
        ? existing.note
        : (isZh ? "保持受力面积 25 cm²" : "Keep the area fixed at 25 cm²"),
      isPending: !existing,
      isCurrent: studyMode === "pressure" && force === value,
    };
  });

  const areaRows = AREA_SEQUENCE.map((key) => {
    const existing = recordsByFactor.area[key];
    const areaMeta = AREA_PRESETS[key];
    return {
      key,
      label: isZh ? areaMeta.label : (key === "wide" ? "Desk flat" : "Desk upside down"),
      value: existing ? formatPressure(existing.pressurePa, isZh) : "",
      note: existing
        ? existing.note
        : (isZh ? "保持压力 5 N" : "Keep the load fixed at 5 N"),
      isPending: !existing,
      isCurrent: studyMode === "area" && areaPreset === key,
    };
  });

  return [
    {
      key: "pressure",
      title: isZh ? "压力对照" : "Load Comparison",
      countLabel: isZh ? `${Object.keys(recordsByFactor.pressure).length} / 3 组` : `${Object.keys(recordsByFactor.pressure).length} / 3 runs`,
      isActive: studyMode === "pressure",
      helper: isZh
        ? "固定受力面积 25 cm²，依次比较 5 N、10 N、15 N。"
        : "Fix the area at 25 cm² and compare 5 N, 10 N, and 15 N.",
      rows: pressureRows,
      conclusion:
        Object.keys(recordsByFactor.pressure).length === PRESSURE_FORCE_OPTIONS.length
          ? (isZh
            ? "课堂结论：受力面积不变时，压力越大，压强越大，海绵形变越明显。"
            : "Conclusion: with the same area, a larger load creates a larger pressure and deeper deformation.")
          : undefined,
    },
    {
      key: "area",
      title: isZh ? "受力面积对照" : "Area Comparison",
      countLabel: isZh ? `${Object.keys(recordsByFactor.area).length} / 2 组` : `${Object.keys(recordsByFactor.area).length} / 2 runs`,
      isActive: studyMode === "area",
      helper: isZh
        ? "固定压力 5 N，只比较正放和倒放带来的受力面积差异。"
        : "Fix the load at 5 N and compare the flat and narrow contact areas.",
      rows: areaRows,
      conclusion:
        Object.keys(recordsByFactor.area).length === AREA_SEQUENCE.length
          ? (isZh
            ? "课堂结论：压力不变时，受力面积越小，压强越大，海绵形变越明显。"
            : "Conclusion: with the same load, a smaller area creates a larger pressure and deeper deformation.")
          : undefined,
    },
  ];
}

function buildComparisonRows({
  studyMode,
  recordsByFactor,
  isZh,
  activeGroupKey,
}: {
  studyMode: StudyMode;
  recordsByFactor: RecordBuckets;
  isZh: boolean;
  activeGroupKey: string;
}) {
  if (studyMode === "pressure") {
    const values = PRESSURE_FORCE_OPTIONS.map((force) => {
      const areaMeta = AREA_PRESETS.wide;
      const recorded = recordsByFactor.pressure[`force-${force}`];
      const pressurePa = recorded?.pressurePa ?? Math.round(force / (areaMeta.areaCm2 / 10000));
      return {
        key: `force-${force}`,
        label: isZh ? `${force} N` : `${force} N`,
        pressurePa,
        recorded: Boolean(recorded),
      };
    });

    const maxValue = Math.max(...values.map((item) => item.pressurePa));

    return values.map((item) => ({
      key: item.key,
      label: item.label,
      valueLabel: item.recorded ? formatPressure(item.pressurePa, isZh) : (isZh ? "待测" : "Pending"),
      percent: Math.max(8, (item.pressurePa / maxValue) * 100),
      active: activeGroupKey === item.key,
    }));
  }

  const values = AREA_SEQUENCE.map((key) => {
    const areaMeta = AREA_PRESETS[key];
    const recorded = recordsByFactor.area[key];
    const pressurePa = recorded?.pressurePa ?? Math.round(DEFAULT_FORCE / (areaMeta.areaCm2 / 10000));
    return {
      key,
      label: isZh ? areaMeta.shortLabel : (key === "wide" ? "Flat" : "Narrow"),
      pressurePa,
      recorded: Boolean(recorded),
    };
  });

  const maxValue = Math.max(...values.map((item) => item.pressurePa));

  return values.map((item) => ({
    key: item.key,
    label: item.label,
    valueLabel: item.recorded ? formatPressure(item.pressurePa, isZh) : (isZh ? "待测" : "Pending"),
    percent: Math.max(8, (item.pressurePa / maxValue) * 100),
    active: activeGroupKey === item.key,
  }));
}

function getCurrentObservationHint({
  studyMode,
  isZh,
  force,
  areaMeta,
  pressureRecordedCount,
  areaRecordedCount,
}: {
  studyMode: StudyMode;
  isZh: boolean;
  force: number;
  areaMeta: AreaMeta;
  pressureRecordedCount: number;
  areaRecordedCount: number;
}) {
  if (studyMode === "pressure") {
    if (pressureRecordedCount === 0) {
      return isZh
        ? `先完成压力 ${force} N 这一组，再继续完成 10 N 和 15 N 的对照。`
        : `Finish the ${force} N run first, then continue with the 10 N and 15 N comparisons.`;
    }

    const nextForce = PRESSURE_FORCE_OPTIONS.find((value) => value !== force && value > force)
      ?? PRESSURE_FORCE_OPTIONS.find((value) => value !== force);

    return nextForce
      ? (isZh
        ? `记录后会自动切到下一组。建议保持面积 ${formatArea(areaMeta.areaCm2, true)}，继续观察压力 ${nextForce} N。`
        : `Recording will jump to the next run. Keep the area at ${formatArea(areaMeta.areaCm2, false)} and observe ${nextForce} N next.`)
      : (isZh
        ? "三组压力对照完成后，就可以直接归纳“压力越大，压强越大”。"
        : "Once all three load runs are done, summarize that larger loads create larger pressure.");
  }

  if (areaRecordedCount === 0) {
    return isZh
      ? "先记录正放这一组，再切到倒放，比较海绵形变的明显变化。"
      : "Record the flat placement first, then switch to the narrow placement and compare the deformation.";
  }

  return isZh
    ? "面积对照完成后，就可以归纳“受力面积越小，压强越大”。"
    : "After both area runs are done, summarize that smaller areas create larger pressure.";
}

function getNextPendingForce(records: Record<string, PressureRecord>) {
  const next = PRESSURE_FORCE_OPTIONS.find((value) => !records[`force-${value}`]);
  return next ?? null;
}

function getNextPendingArea(records: Record<string, PressureRecord>) {
  const next = AREA_SEQUENCE.find((key) => !records[key]);
  return next ?? null;
}

function calculateDeformationMm(pressurePa: number) {
  return Math.max(6, Math.round(pressurePa / 420));
}

function formatArea(areaCm2: number, isZh: boolean) {
  return isZh ? `${areaCm2} cm²` : `${areaCm2} cm²`;
}

function formatPressure(pressurePa: number, isZh: boolean) {
  if (pressurePa <= 0) {
    return isZh ? "0 Pa" : "0 Pa";
  }

  return isZh ? `${pressurePa} Pa` : `${pressurePa} Pa`;
}

function formatDeformation(valueMm: number, isZh: boolean) {
  if (valueMm <= 0) {
    return isZh ? "0 mm" : "0 mm";
  }

  return isZh ? `${valueMm} mm` : `${valueMm} mm`;
}

function clearObservationTimer(timerId: ObservationTimer | null) {
  if (timerId !== null) {
    globalThis.clearTimeout(timerId);
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
