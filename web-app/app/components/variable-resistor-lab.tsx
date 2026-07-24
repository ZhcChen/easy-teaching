import { useMemo, useState, type RefObject } from "react";

import type { TeachingTopic } from "../data/teaching-catalog";
import { useLocale } from "../i18n";
import { BasicForceRecordTable, type BasicForceRecordGroup } from "./basic-force-record-table";
import { ControlButton } from "./control-button";
import { ControlChipGroup } from "./control-chip-group";
import { ControlPanelSection } from "./control-panel-section";
import { ControlRange } from "./control-range";
import { ControlStepGroup } from "./control-step-group";
import { StatusPill } from "./status-pill";
import { TeachingLabShell } from "./teaching-lab-shell";

type VariableResistorLabProps = {
  topic: TeachingTopic;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
};

type WiringMode = "A-C" | "B-C" | "A-B" | "C-D";
type ResistorSceneKey = "correct-left" | "correct-right" | "two-top" | "two-bottom" | "protection";

type ResistorPreset = {
  key: ResistorSceneKey;
  stepLabel: string;
  label: string;
  summary: string;
  wiring: WiringMode;
  sliderPercent: number;
  switchClosed: boolean;
};

type ResistorRecord = {
  value: string;
  note: string;
};

const PANEL_STORAGE_KEY = "easy-teaching.variable-resistor.panel-collapsed";
const RHEOSTAT_MAX_OHM = 20;
const FIXED_RESISTOR_OHM = 10;
const SAFE_CURRENT_LIMIT_A = 1;

const PRESETS: Record<ResistorSceneKey, ResistorPreset> = {
  "correct-left": {
    key: "correct-left",
    stepLabel: "1",
    label: "A-C 正接",
    summary: "一上一下正确接线，滑片右移时接入电阻丝变长，电阻增大，电流减小。",
    wiring: "A-C",
    sliderPercent: 40,
    switchClosed: true,
  },
  "correct-right": {
    key: "correct-right",
    stepLabel: "2",
    label: "B-C 反向",
    summary: "另一种一上一下接线下，滑片右移时接入电阻丝反而变短，电流会增大。",
    wiring: "B-C",
    sliderPercent: 40,
    switchClosed: true,
  },
  "two-top": {
    key: "two-top",
    stepLabel: "3",
    label: "A-B 两上",
    summary: "两上接线柱等效接入全部电阻丝，滑片怎么移动都不再改变电阻。",
    wiring: "A-B",
    sliderPercent: 50,
    switchClosed: true,
  },
  "two-bottom": {
    key: "two-bottom",
    stepLabel: "4",
    label: "C-D 两下",
    summary: "两下接线柱等效为导线，电阻几乎为零，闭合开关容易过流。",
    wiring: "C-D",
    sliderPercent: 50,
    switchClosed: true,
  },
  protection: {
    key: "protection",
    stepLabel: "5",
    label: "保护电路",
    summary: "闭合开关前应先把滑片调到阻值最大处，这样初始电流最小，更安全。",
    wiring: "A-C",
    sliderPercent: 100,
    switchClosed: false,
  },
};

export function VariableResistorLab({
  topic,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
}: VariableResistorLabProps) {
  const { isZh, tt } = useLocale();
  const [scene, setScene] = useState<ResistorSceneKey>("correct-left");
  const [wiring, setWiring] = useState<WiringMode>(PRESETS["correct-left"].wiring);
  const [sliderPercent, setSliderPercent] = useState(PRESETS["correct-left"].sliderPercent);
  const [switchClosed, setSwitchClosed] = useState(PRESETS["correct-left"].switchClosed);
  const [sourceVoltage, setSourceVoltage] = useState(12);
  const [records, setRecords] = useState<Partial<Record<ResistorSceneKey, ResistorRecord>>>({});

  const metrics = useMemo(
    () => buildResistorMetrics({ wiring, sliderPercent, switchClosed, sourceVoltage, isZh }),
    [isZh, sliderPercent, sourceVoltage, switchClosed, wiring],
  );

  const stepItems = Object.values(PRESETS).map((preset) => ({
    key: preset.key,
    stepLabel: preset.stepLabel,
    label: tt(preset.label),
    active: scene === preset.key,
    title: tt(preset.summary),
    onClick: () => applyPreset(preset.key),
  }));

  const wiringItems = [
    { key: "A-C", label: "A-C", active: wiring === "A-C", onClick: () => setWiring("A-C"), title: isZh ? "左段接入：滑片右移时电阻增大" : "Left segment: moving right increases resistance" },
    { key: "B-C", label: "B-C", active: wiring === "B-C", onClick: () => setWiring("B-C"), title: isZh ? "右段接入：滑片右移时电阻减小" : "Right segment: moving right decreases resistance" },
    { key: "A-B", label: "A-B", active: wiring === "A-B", onClick: () => setWiring("A-B"), title: isZh ? "两上接线：始终最大电阻" : "Two upper posts: always maximum resistance" },
    { key: "C-D", label: "C-D", active: wiring === "C-D", onClick: () => setWiring("C-D"), title: isZh ? "两下接线：等效导线" : "Two lower posts: short wire" },
  ];

  const recordGroups: BasicForceRecordGroup[] = [
    {
      key: "rheostat-worksheet",
      title: isZh ? "滑动变阻器记录单" : "Rheostat Worksheet",
      countLabel: `${Object.keys(records).length} / 5`,
      isActive: true,
      helper: isZh ? "建议按“正接 → 反向 → 两上 → 两下 → 保护电路”的顺序记录。" : "Record correct wiring, reversed wiring, two-upper, two-lower, and protection in order.",
      conclusion:
        Object.keys(records).length < 5
          ? (isZh ? "补齐五组记录后，可以完整说明“必须一上一下接线”和“先调到最大阻值处”的原因。" : "Complete all five scenes to explain why the wiring must use one upper and one lower post, and why the slider should start at maximum resistance.")
          : (isZh ? "归纳：只有一上一下接线时滑片才真正参与调阻；A-C 与 B-C 方向相反；两上固定最大阻值，两下等效导线；闭合开关前应先调到最大阻值处保护电路。" : "Summary: the slider only changes resistance with one-upper-one-lower wiring; A-C and B-C react in opposite directions; the two-upper wiring locks in the maximum resistance, the two-lower wiring acts like a wire, and the slider should start at maximum resistance before closing the switch."),
      rows: Object.values(PRESETS).map((preset) => {
        const record = records[preset.key];
        return record
          ? {
              key: preset.key,
              label: tt(preset.label),
              value: record.value,
              note: record.note,
            }
          : {
              key: preset.key,
              label: tt(preset.label),
              value: isZh ? "待测" : "Pending",
              note: isZh ? "先观察电流、电压和亮度变化，再记录结论。" : "Observe current, voltage, and brightness before recording the conclusion.",
              isPending: true,
            };
      }),
    },
  ];

  function applyPreset(nextScene: ResistorSceneKey) {
    const preset = PRESETS[nextScene];
    setScene(nextScene);
    setWiring(preset.wiring);
    setSliderPercent(preset.sliderPercent);
    setSwitchClosed(preset.switchClosed);
  }

  function recordCurrentScene() {
    setRecords((previous) => ({
      ...previous,
      [scene]: {
        value: metrics.recordValue,
        note: metrics.summary,
      },
    }));
  }

  function resetLab() {
    setRecords({});
    setSourceVoltage(12);
    applyPreset("correct-left");
  }

  return (
    <TeachingLabShell
      panelStorageKey={PANEL_STORAGE_KEY}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      fullscreenRef={fullscreenRef}
      controlTitle={isZh ? "参数控制" : "Control Panel"}
      controlCopy={isZh ? "围绕接线方式、滑片位置和开关状态，观察电阻、电流、电压分配和灯泡亮度变化。" : "Observe resistance, current, voltage split, and lamp brightness through wiring mode, slider position, and switch state."}
      statusItems={[
        <StatusPill key="topic" tone="active">{isZh ? "滑动变阻器" : "Variable Resistor"}</StatusPill>,
        <StatusPill key="status" tone={metrics.statusTone}>{metrics.statusLabel}</StatusPill>,
      ]}
      rootClassName="resistor-lab-shell"
      panelClassName="resistor-control-panel"
      mainClassName="resistor-lab-main"
      controlContent={
        <>
          <ControlPanelSection
            title={isZh ? "课堂步骤" : "Class Steps"}
            hint={isZh ? "先走典型接法，再讲保护电路" : "Walk through the typical wiring cases before the protection rule"}
            accent
          >
            <ControlStepGroup items={stepItems} className="control-step-group is-panel" />
            <p className="force-inline-copy">{tt(PRESETS[scene].summary)}</p>
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "接线方式" : "Wiring Mode"}
            hint={isZh ? "关键规则：必须一上一下" : "Key rule: one upper and one lower post"}
          >
            <ControlChipGroup items={wiringItems} columns={2} />
            <ControlChipGroup
              items={[
                {
                  key: "switch-open",
                  label: isZh ? "开关断开" : "Switch open",
                  active: !switchClosed,
                  onClick: () => setSwitchClosed(false),
                },
                {
                  key: "switch-close",
                  label: isZh ? "开关闭合" : "Switch closed",
                  active: switchClosed,
                  onClick: () => setSwitchClosed(true),
                },
              ]}
              columns={2}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "核心参数" : "Core Parameters"}
            hint={isZh ? "滑片位置决定接入长度，电源电压决定整体电流规模" : "Slider position sets inserted length, source voltage sets the overall current"}
          >
            <ControlRange
              id="resistor-slider"
              label={isZh ? "滑片位置" : "Slider position"}
              min={0}
              max={100}
              step={1}
              unit="%"
              editable
              value={sliderPercent}
              onChange={setSliderPercent}
            />
            <ControlRange
              id="resistor-voltage"
              label={isZh ? "电源电压" : "Source voltage"}
              min={6}
              max={12}
              step={0.5}
              unit="V"
              editable
              value={sourceVoltage}
              onChange={setSourceVoltage}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "操作与记录" : "Observe & Record"}
            hint={isZh ? "看清电流和亮度变化，再记录本组" : "Observe current and brightness before recording"}
          >
            <div className="force-action-grid">
              <ControlButton variant="primary" onClick={recordCurrentScene}>
                {isZh ? "记录本组" : "Record This Run"}
              </ControlButton>
              <ControlButton variant="ghost" onClick={() => applyPreset(scene)}>
                {isZh ? "恢复预设" : "Restore Preset"}
              </ControlButton>
              <ControlButton variant="ghost" onClick={resetLab}>
                {tt("重置")}
              </ControlButton>
            </div>

            <p className="force-inline-copy">{metrics.summary}</p>

            <BasicForceRecordTable
              groups={recordGroups}
              emptyTitle={isZh ? "先完成第一组观察" : "Finish the first observation"}
              emptyCopy={isZh ? "建议先看 A-C 和 B-C 的方向差异，再看两上、两下和保护电路。" : "Start with A-C and B-C to see the direction difference, then move to the two-upper, two-lower, and protection cases."}
              pendingCopy={isZh ? "待测" : "Pending"}
            />
          </ControlPanelSection>

          <ControlPanelSection
            title={isZh ? "思考提示" : "Think Prompt"}
            hint={isZh ? "从实验电路和安全操作切入" : "Use both circuit analysis and safety habits"}
          >
            <ul className="force-support-question-list">
              <li>{isZh ? "为什么 A-C 和 B-C 都是一上一下接线，但滑片右移的效果却相反？" : "Why do A-C and B-C both use one-upper-one-lower wiring but react oppositely when the slider moves right?"}</li>
              <li>{isZh ? "两下接线为什么会让电路几乎失去调阻功能？" : "Why does the two-lower wiring almost remove the resistance-adjustment function?"}</li>
              <li>{isZh ? "为什么闭合开关前要把滑片移到阻值最大处？" : "Why should the slider be set to the maximum resistance before closing the switch?"}</li>
            </ul>
          </ControlPanelSection>
        </>
      }
      stageContent={
        <div className="visual-canvas force-stage-canvas resistor-stage-canvas is-2d-mode">
          <ControlStepGroup
            className="force-stage-overlay is-top-center force-stage-stepbar"
            items={stepItems}
          />
          <div className="visual-glow visual-glow-a" />
          <div className="visual-glow visual-glow-b" />

          <div className="force-stage-overlay is-top-left">
            <div className="force-stage-hud-card">
              <div className="force-stage-hud-head">
                <span className="force-stage-hud-title">{isZh ? "当前验证重点" : "Current focus"}</span>
                <StatusPill tone={metrics.statusTone}>{metrics.statusLabel}</StatusPill>
              </div>
              <p className="pressure-stage-copy">{tt(PRESETS[scene].summary)}</p>
              <div className="force-stage-chip-grid">
                <span className="force-stage-chip">{metrics.wiringEffectLabel}</span>
                <span className="force-stage-chip">{metrics.safetyLabel}</span>
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
                  <strong>{`${formatNumber(metrics.rheostatResistance)} Ω`}</strong>
                  <span>{isZh ? "R变" : "R_var"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{`${formatNumber(metrics.totalCurrent)} A`}</strong>
                  <span>{isZh ? "电流 I" : "Current"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{`${formatNumber(metrics.fixedVoltage)} V`}</strong>
                  <span>{isZh ? "灯泡电压" : "Lamp voltage"}</span>
                </article>
                <article className="force-stage-result-pill">
                  <strong>{`${metrics.brightnessPercent}%`}</strong>
                  <span>{isZh ? "亮度" : "Brightness"}</span>
                </article>
              </div>
              <p className="pressure-stage-formula">{metrics.formulaCopy}</p>
            </div>
          </div>

          <div className="force-stage-overlay is-bottom-right">
            <div className="force-stage-hud-card is-tight shadow-stage-summary-card">
              <div className="force-stage-hud-head">
                <span className="force-stage-hud-title">{isZh ? "课堂摘要" : "Classroom Summary"}</span>
                <span className="force-stage-chip">{`${Object.keys(records).length} / 5`}</span>
              </div>
              <div className="shadow-stage-summary-grid">
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "接线方式" : "Wiring"}</span>
                  <strong>{wiring}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "滑片位置" : "Slider"}</span>
                  <strong>{`${sliderPercent}%`}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "安全状态" : "Safety"}</span>
                  <strong>{metrics.safetyLabel}</strong>
                </article>
                <article className="shadow-stage-summary-item">
                  <span>{isZh ? "已记录" : "Recorded"}</span>
                  <strong>{`${Object.keys(records).length} / 5`}</strong>
                </article>
              </div>
            </div>
          </div>

          <svg
            viewBox="0 0 1160 760"
            className="force-stage-svg resistor-stage-svg"
            role="img"
            aria-label={isZh ? `${topic.title}可视化示意图` : `${topic.title} visualization`}
          >
            <rect x="74" y="88" width="1012" height="560" rx="36" className="motion-stage-panel-shell" />
            <text x="110" y="126" className="motion-stage-panel-title">{isZh ? "滑动变阻器实验台" : "Rheostat Bench"}</text>
            <text x="110" y="152" className="motion-stage-panel-copy">
              {isZh ? "观察滑片位置、接线方式和开关状态如何改变总电阻、电流、电压分配和灯泡亮度。" : "Observe how slider position, wiring mode, and switch state change total resistance, current, voltage distribution, and lamp brightness."}
            </text>

            <path
              d="M 182 228 L 182 470 L 968 470 L 968 228 L 182 228"
              className={switchClosed ? "resistor-stage-wire is-active" : "resistor-stage-wire"}
            />

            <line x1="182" y1="314" x2="222" y2="314" className="resistor-stage-battery-plate is-short" />
            <line x1="182" y1="340" x2="236" y2="340" className="resistor-stage-battery-plate is-long" />
            <text x="164" y="362" className="motion-stage-ruler-label">{isZh ? "电源" : "Source"}</text>
            <text x="164" y="388" className="force-svg-copy">{`${formatNumber(sourceVoltage)} V`}</text>

            <circle cx="362" cy="470" r="48" className={metrics.brightnessPercent > 0 ? "resistor-stage-lamp is-active" : "resistor-stage-lamp"} style={{ opacity: 0.45 + metrics.brightnessPercent / 180 }} />
            <text x="362" y="548" textAnchor="middle" className="motion-stage-ruler-label">{isZh ? "灯泡 / 定值电阻" : "Lamp / Fixed resistor"}</text>

            <rect x="502" y="438" width="302" height="24" rx="12" className="resistor-stage-track" />
            <rect x="502" y="438" width={302 * metrics.activeTrackRatio} height="24" rx="12" className="resistor-stage-track-fill" />
            <rect x={502 + (sliderPercent / 100) * 302 - 12} y="420" width="24" height="60" rx="12" className="resistor-stage-slider" />
            <text x="654" y="548" textAnchor="middle" className="motion-stage-ruler-label">{isZh ? "滑动变阻器" : "Rheostat"}</text>
            <text x="654" y="576" textAnchor="middle" className="force-svg-copy">{`${wiring} · Rmax ${RHEOSTAT_MAX_OHM} Ω`}</text>

            <rect x="842" y="220" width="118" height="56" rx="22" className={switchClosed ? "resistor-stage-switch is-closed" : "resistor-stage-switch"} />
            {switchClosed ? (
              <line x1="866" y1="248" x2="934" y2="248" className="resistor-stage-switch-bar" />
            ) : (
              <line x1="866" y1="256" x2="930" y2="230" className="resistor-stage-switch-bar" />
            )}
            <text x="900" y="300" textAnchor="middle" className="motion-stage-ruler-label">{isZh ? "开关" : "Switch"}</text>

            <text x="260" y="208" className="force-svg-copy">{isZh ? `总电阻 = ${formatNumber(metrics.totalResistance)} Ω` : `Total R = ${formatNumber(metrics.totalResistance)} Ω`}</text>
            <text x="260" y="236" className="force-svg-copy">{isZh ? `电流 I = ${formatNumber(metrics.totalCurrent)} A` : `I = ${formatNumber(metrics.totalCurrent)} A`}</text>
            <text x="260" y="264" className="force-svg-copy">{isZh ? `灯泡电压 = ${formatNumber(metrics.fixedVoltage)} V` : `Lamp V = ${formatNumber(metrics.fixedVoltage)} V`}</text>
            <text x="260" y="292" className="force-svg-copy">{isZh ? `变阻器电压 = ${formatNumber(metrics.rheostatVoltage)} V` : `Rheostat V = ${formatNumber(metrics.rheostatVoltage)} V`}</text>
          </svg>
        </div>
      }
    />
  );
}

function buildResistorMetrics({
  wiring,
  sliderPercent,
  switchClosed,
  sourceVoltage,
  isZh,
}: {
  wiring: WiringMode;
  sliderPercent: number;
  switchClosed: boolean;
  sourceVoltage: number;
  isZh: boolean;
}) {
  const ratio = sliderPercent / 100;
  let rheostatResistance = 0;
  let wiringEffectLabel = "";

  if (wiring === "A-C") {
    rheostatResistance = RHEOSTAT_MAX_OHM * ratio;
    wiringEffectLabel = isZh ? "滑片右移：电阻增大" : "Right move: R increases";
  } else if (wiring === "B-C") {
    rheostatResistance = RHEOSTAT_MAX_OHM * (1 - ratio);
    wiringEffectLabel = isZh ? "滑片右移：电阻减小" : "Right move: R decreases";
  } else if (wiring === "A-B") {
    rheostatResistance = RHEOSTAT_MAX_OHM;
    wiringEffectLabel = isZh ? "始终最大电阻" : "Always max resistance";
  } else {
    rheostatResistance = 0;
    wiringEffectLabel = isZh ? "等效导线" : "Acts like a wire";
  }

  const totalResistance = FIXED_RESISTOR_OHM + rheostatResistance;
  const totalCurrent = switchClosed ? sourceVoltage / Math.max(totalResistance, 0.0001) : 0;
  const rheostatVoltage = totalCurrent * rheostatResistance;
  const fixedVoltage = totalCurrent * FIXED_RESISTOR_OHM;
  const brightnessPercent = switchClosed ? clamp(Math.round((fixedVoltage / sourceVoltage) * 100), 0, 100) : 0;
  const overCurrent = switchClosed && totalCurrent > SAFE_CURRENT_LIMIT_A;
  const safetyLabel = !switchClosed
    ? (isZh ? "开关未闭合，处于准备状态" : "Switch open: safe preparation")
    : overCurrent
      ? (isZh ? "过流风险，需保护电路" : "Overcurrent risk")
      : (isZh ? "工作安全" : "Safe operation");
  const statusLabel = !switchClosed
    ? (isZh ? "准备闭合" : "Ready to close")
    : overCurrent
      ? (isZh ? "过流预警" : "Overcurrent warning")
      : (isZh ? "电路导通" : "Circuit closed");
  const statusTone = !switchClosed ? "warning" as const : overCurrent ? "balanced" as const : "active" as const;
  const summary = !switchClosed
    ? (isZh ? `当前开关断开。若采用 ${wiring} 接线并先把滑片调到当前阻值 ${formatNumber(rheostatResistance)} Ω，再闭合开关会更安全。` : `The switch is open. With ${wiring} wiring, preparing the slider at the current ${formatNumber(rheostatResistance)} Ω makes the next close safer.`)
    : overCurrent
      ? (isZh ? `当前总电流 ${formatNumber(totalCurrent)} A 已超过安全上限 ${SAFE_CURRENT_LIMIT_A} A，需要增大滑动变阻器阻值来保护电路。` : `The current ${formatNumber(totalCurrent)} A exceeds the safe limit of ${SAFE_CURRENT_LIMIT_A} A, so the rheostat resistance should be increased.`)
      : (isZh ? `${wiring} 接线下，变阻器阻值约 ${formatNumber(rheostatResistance)} Ω，总电流 ${formatNumber(totalCurrent)} A，灯泡亮度随电流同步变化。` : `With ${wiring} wiring, the rheostat is about ${formatNumber(rheostatResistance)} Ω, the total current is ${formatNumber(totalCurrent)} A, and the lamp brightness follows the current.`)
  ;
  const formulaCopy = isZh
    ? `I = U / (R定 + R变) = ${formatNumber(sourceVoltage)} / (${FIXED_RESISTOR_OHM} + ${formatNumber(rheostatResistance)}) ≈ ${formatNumber(totalCurrent)} A。`
    : `I = U / (R_fixed + R_var) = ${formatNumber(sourceVoltage)} / (${FIXED_RESISTOR_OHM} + ${formatNumber(rheostatResistance)}) ≈ ${formatNumber(totalCurrent)} A.`;

  return {
    rheostatResistance,
    totalResistance,
    totalCurrent,
    rheostatVoltage,
    fixedVoltage,
    brightnessPercent,
    wiringEffectLabel,
    safetyLabel,
    statusLabel,
    statusTone,
    summary,
    formulaCopy,
    recordValue: `${formatNumber(totalCurrent)} A`,
    activeTrackRatio: wiring === "A-C" ? ratio : wiring === "B-C" ? 1 - ratio : wiring === "A-B" ? 1 : 0.08,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}
