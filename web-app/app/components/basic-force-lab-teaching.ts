import {
  getClassroomGroupKey,
  getClassroomGroupOrder,
  getClassroomVariableKey,
  getRecommendedParametersForFactor,
  type ClassroomRecord,
  type ClassroomSessionState,
  type ContactAreaKey,
  type StudyFactor,
  type SurfacePresetKey,
} from "./basic-force-lab-state";

export type ClassroomGroupValue = number | SurfacePresetKey | ContactAreaKey;
export type TeachingStabilityLevel = "building" | "settling" | "recordable";
export type TeachingStabilityReason =
  | "idle"
  | "measuring"
  | "recordable"
  | "recorded"
  | "invalidated"
  | "extended";
export type TeachingPrincipleState = "hidden" | "available" | "formal";
export type TeachingConclusionLevel = "none" | "trend" | "formal";
export type TeachingConclusionKey =
  | "pressure-increase"
  | "pressure-remeasure"
  | "surface-increase"
  | "surface-remeasure"
  | "contact-area-no-change"
  | "contact-area-remeasure";

export type ClassroomTeachingConclusion = {
  level: Exclude<TeachingConclusionLevel, "none">;
  key: TeachingConclusionKey;
};

export type ClassroomTeachingExpectedGroup = {
  factor: StudyFactor;
  groupKey: string;
  value: ClassroomGroupValue;
  orderIndex: number;
  isCurrent: boolean;
  isCompleted: boolean;
};

export type ClassroomFactorTeachingState = {
  factor: StudyFactor;
  totalRequired: number;
  completedCount: number;
  currentGroupRecorded: boolean;
  expectedGroups: ClassroomTeachingExpectedGroup[];
  missingGroupKeys: string[];
  nextGroupKey?: string;
  nextGroupValue?: ClassroomGroupValue;
  conclusionLevel: TeachingConclusionLevel;
  conclusion?: ClassroomTeachingConclusion;
};

export type ClassroomTeachingState = {
  currentGroupKey: string;
  stability: {
    level: TeachingStabilityLevel;
    reason: TeachingStabilityReason;
  };
  canRecordCurrentMeasurement: boolean;
  principleState: TeachingPrincipleState;
  activeFactor: ClassroomFactorTeachingState;
  factors: Record<StudyFactor, ClassroomFactorTeachingState>;
};

const FACTOR_KEYS: StudyFactor[] = ["pressure", "surface", "contact-area"];
const PRESSURE_TREND_THRESHOLD = 0.05;
const SURFACE_TREND_THRESHOLD = 0.05;
const CONTACT_AREA_RANGE_THRESHOLD = 0.08;

export function deriveClassroomTeachingState({
  session,
  isTeachingMeasurementMode,
}: {
  session: ClassroomSessionState;
  isTeachingMeasurementMode: boolean;
}): ClassroomTeachingState {
  const currentGroupKey = getClassroomGroupKey(session.studyFactor, session.parameters);
  const factors = FACTOR_KEYS.reduce<Record<StudyFactor, ClassroomFactorTeachingState>>(
    (collection, factor) => {
      const activeGroupKey = factor === session.studyFactor ? currentGroupKey : undefined;

      collection[factor] = buildFactorTeachingState({
        factor,
        records: session.recordsByFactor[factor],
        activeGroupKey,
        isTeachingMeasurementMode,
      });

      return collection;
    },
    {
      pressure: createEmptyFactorTeachingState("pressure"),
      surface: createEmptyFactorTeachingState("surface"),
      "contact-area": createEmptyFactorTeachingState("contact-area"),
    },
  );
  const activeFactor = factors[session.studyFactor];
  const canRecordCurrentMeasurement =
    isTeachingMeasurementMode &&
    session.isClassroomCandidate &&
    (session.eligibility === "recordable" || session.eligibility === "recorded");

  return {
    currentGroupKey,
    stability: deriveTeachingStability({
      eligibility: session.eligibility,
      isTeachingMeasurementMode,
      isClassroomCandidate: session.isClassroomCandidate,
    }),
    canRecordCurrentMeasurement,
    principleState: derivePrincipleState({
      activeFactor,
      isTeachingMeasurementMode,
      isClassroomCandidate: session.isClassroomCandidate,
    }),
    activeFactor,
    factors,
  };
}

export function formatTeachingConclusionCopy(
  conclusion: ClassroomTeachingConclusion | undefined,
  isZh: boolean,
) {
  if (!conclusion) {
    return undefined;
  }

  const prefix =
    conclusion.level === "formal"
      ? isZh
        ? "课堂结论："
        : "Class conclusion: "
      : isZh
        ? "初步趋势："
        : "Early trend: ";

  return `${prefix}${getTeachingConclusionBody(conclusion.key, isZh)}`;
}

function createEmptyFactorTeachingState(
  factor: StudyFactor,
): ClassroomFactorTeachingState {
  return {
    factor,
    totalRequired: 0,
    completedCount: 0,
    currentGroupRecorded: false,
    expectedGroups: [],
    missingGroupKeys: [],
    conclusionLevel: "none",
  };
}

function buildFactorTeachingState({
  factor,
  records,
  activeGroupKey,
  isTeachingMeasurementMode,
}: {
  factor: StudyFactor;
  records: ClassroomRecord[];
  activeGroupKey?: string;
  isTeachingMeasurementMode: boolean;
}): ClassroomFactorTeachingState {
  const recordMap = new Map(records.map((record) => [record.groupKey, record]));
  const expectedGroups = buildExpectedGroups({
    factor,
    recordMap,
    activeGroupKey,
  });
  const missingGroups = expectedGroups.filter((group) => !group.isCompleted);
  const completedGroups = expectedGroups.filter((group) => group.isCompleted);
  const currentGroupRecorded = activeGroupKey
    ? expectedGroups.some((group) => group.groupKey === activeGroupKey && group.isCompleted)
    : false;
  const conclusion = isTeachingMeasurementMode
    ? deriveTeachingConclusion(factor, expectedGroups, recordMap)
    : undefined;
  const nextGroup = isTeachingMeasurementMode
    ? pickNextExpectedGroup(expectedGroups, activeGroupKey)
    : undefined;

  return {
    factor,
    totalRequired: expectedGroups.length,
    completedCount: completedGroups.length,
    currentGroupRecorded,
    expectedGroups,
    missingGroupKeys: missingGroups.map((group) => group.groupKey),
    nextGroupKey: nextGroup?.groupKey,
    nextGroupValue: nextGroup?.value,
    conclusionLevel: conclusion?.level ?? "none",
    conclusion,
  };
}

function buildExpectedGroups({
  factor,
  recordMap,
  activeGroupKey,
}: {
  factor: StudyFactor;
  recordMap: Map<string, ClassroomRecord>;
  activeGroupKey?: string;
}): ClassroomTeachingExpectedGroup[] {
  const baseline = getRecommendedParametersForFactor(factor);
  const variableKey = getClassroomVariableKey(factor);

  return getClassroomGroupOrder(factor).map((value, orderIndex) => {
    const groupKey = getClassroomGroupKey(factor, {
      ...baseline,
      [variableKey]: value,
    });

    return {
      factor,
      groupKey,
      value: value as ClassroomGroupValue,
      orderIndex,
      isCurrent: groupKey === activeGroupKey,
      isCompleted: recordMap.has(groupKey),
    };
  });
}

function pickNextExpectedGroup(
  expectedGroups: ClassroomTeachingExpectedGroup[],
  activeGroupKey?: string,
) {
  const missingGroups = expectedGroups.filter((group) => !group.isCompleted);

  if (missingGroups.length === 0) {
    return undefined;
  }

  if (!activeGroupKey) {
    return missingGroups[0];
  }

  const currentGroup = expectedGroups.find((group) => group.groupKey === activeGroupKey);

  if (!currentGroup) {
    return missingGroups[0];
  }

  if (!currentGroup.isCompleted) {
    return currentGroup;
  }

  return missingGroups.find((group) => group.orderIndex > currentGroup.orderIndex) ?? missingGroups[0];
}

function deriveTeachingStability({
  eligibility,
  isTeachingMeasurementMode,
  isClassroomCandidate,
}: {
  eligibility: ClassroomSessionState["eligibility"];
  isTeachingMeasurementMode: boolean;
  isClassroomCandidate: boolean;
}): ClassroomTeachingState["stability"] {
  if (!isTeachingMeasurementMode || !isClassroomCandidate) {
    return {
      level: "building",
      reason: "extended",
    };
  }

  switch (eligibility) {
    case "measuring":
      return {
        level: "settling",
        reason: "measuring",
      };
    case "recordable":
      return {
        level: "recordable",
        reason: "recordable",
      };
    case "recorded":
      return {
        level: "recordable",
        reason: "recorded",
      };
    case "invalidated":
      return {
        level: "building",
        reason: "invalidated",
      };
    case "idle":
    default:
      return {
        level: "building",
        reason: "idle",
      };
  }
}

function derivePrincipleState({
  activeFactor,
  isTeachingMeasurementMode,
  isClassroomCandidate,
}: {
  activeFactor: ClassroomFactorTeachingState;
  isTeachingMeasurementMode: boolean;
  isClassroomCandidate: boolean;
}): TeachingPrincipleState {
  if (!isTeachingMeasurementMode || !isClassroomCandidate || !activeFactor.currentGroupRecorded) {
    return "hidden";
  }

  if (activeFactor.conclusionLevel === "formal") {
    return "formal";
  }

  return "available";
}

function deriveTeachingConclusion(
  factor: StudyFactor,
  expectedGroups: ClassroomTeachingExpectedGroup[],
  recordMap: Map<string, ClassroomRecord>,
): ClassroomTeachingConclusion | undefined {
  const completedRecords = expectedGroups
    .filter((group) => group.isCompleted)
    .map((group) => recordMap.get(group.groupKey))
    .filter((record): record is ClassroomRecord => Boolean(record));

  if (completedRecords.length < 2) {
    return undefined;
  }

  const level: ClassroomTeachingConclusion["level"] =
    completedRecords.length === expectedGroups.length ? "formal" : "trend";

  switch (factor) {
    case "pressure": {
      const first = completedRecords[0];
      const last = completedRecords[completedRecords.length - 1];

      return {
        level,
        key:
          last.kineticFriction > first.kineticFriction + PRESSURE_TREND_THRESHOLD
            ? "pressure-increase"
            : "pressure-remeasure",
      };
    }
    case "surface": {
      const first = completedRecords[0];
      const last = completedRecords[completedRecords.length - 1];

      return {
        level,
        key:
          last.kineticFriction > first.kineticFriction + SURFACE_TREND_THRESHOLD
            ? "surface-increase"
            : "surface-remeasure",
      };
    }
    case "contact-area": {
      const values = completedRecords.map((record) => record.kineticFriction);
      const valueRange = Math.max(...values) - Math.min(...values);

      return {
        level,
        key:
          valueRange <= CONTACT_AREA_RANGE_THRESHOLD
            ? "contact-area-no-change"
            : "contact-area-remeasure",
      };
    }
    default:
      return undefined;
  }
}

function getTeachingConclusionBody(
  key: TeachingConclusionKey,
  isZh: boolean,
) {
  switch (key) {
    case "pressure-increase":
      return isZh
        ? "保持材质和摆放不变时，压力越大，滑动摩擦力越大。"
        : "With the same surface and placement, greater pressure leads to greater sliding friction.";
    case "pressure-remeasure":
      return isZh
        ? "这组压力对照差异还不够清晰，可再检查是否保持匀速并重新测量。"
        : "The pressure contrast is not clear enough yet. Recheck the uniform pull and measure again.";
    case "surface-increase":
      return isZh
        ? "保持压力和摆放不变时，接触面越粗糙，滑动摩擦力越大。"
        : "With the same pressure and placement, rougher surfaces produce greater sliding friction.";
    case "surface-remeasure":
      return isZh
        ? "材质对照差异还不够清晰，可再检查是否只改变了接触材质。"
        : "The surface contrast is not clear enough yet. Recheck whether only the surface changed.";
    case "contact-area-no-change":
      return isZh
        ? "保持材质和压力不变时，接触面积变化后，滑动摩擦力基本不变。"
        : "With the same surface and pressure, changing the contact area leaves sliding friction nearly unchanged.";
    case "contact-area-remeasure":
      return isZh
        ? "面积对照的差异偏大，可再检查是否保持压力、材质和匀速拉动都一致。"
        : "The contact-area readings differ more than expected. Recheck the pressure, surface, and uniform pull.";
    default:
      return "";
  }
}
