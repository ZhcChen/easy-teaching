export type SurfacePresetKey = "smooth-board" | "wood-board" | "cloth" | "towel";
export type ContactAreaKey = "flat" | "side" | "upright";
export type ForceExperimentMode = "measurement" | "constant-pull" | "manual-drag";
export type ForceViewMode = "2d" | "3d";
export type StudyFactor = "pressure" | "surface" | "contact-area";
export type MeasurementEligibility =
  | "idle"
  | "measuring"
  | "recordable"
  | "recorded"
  | "invalidated";

export type ClassroomParameters = {
  pressure: number;
  surfacePreset: SurfacePresetKey;
  contactArea: ContactAreaKey;
};

export type ClassroomEntryState = {
  viewMode: "2d";
  mode: "measurement";
  isControlPanelCollapsed: false;
};

export type ClassroomRecord = ClassroomParameters & {
  factor: StudyFactor;
  groupKey: string;
  stablePullForce: number;
  kineticFriction: number;
  staticLimit: number;
};

export type ClassroomMeasurementInput = {
  stablePullForce: number;
  kineticFriction: number;
  staticLimit: number;
};

export type ClassroomSessionState = {
  entry: ClassroomEntryState;
  studyFactor: StudyFactor;
  parameters: ClassroomParameters;
  eligibility: MeasurementEligibility;
  isClassroomCandidate: boolean;
  recordsByFactor: Record<StudyFactor, ClassroomRecord[]>;
};

type ClassroomVariableKey = keyof ClassroomParameters;

type ClassroomFactorConfig = {
  variableKey: ClassroomVariableKey;
  baseline: ClassroomParameters;
  order: ReadonlyArray<number | string>;
};

export const DEFAULT_CLASSROOM_STUDY_FACTOR: StudyFactor = "pressure";

export const DEFAULT_CLASSROOM_ENTRY_STATE: ClassroomEntryState = {
  viewMode: "2d",
  mode: "measurement",
  isControlPanelCollapsed: false,
};

const CLASSROOM_FACTOR_CONFIG: Record<StudyFactor, ClassroomFactorConfig> = {
  pressure: {
    variableKey: "pressure",
    baseline: {
      pressure: 4,
      surfacePreset: "wood-board",
      contactArea: "flat",
    },
    order: [2, 4, 6],
  },
  surface: {
    variableKey: "surfacePreset",
    baseline: {
      pressure: 2,
      surfacePreset: "wood-board",
      contactArea: "flat",
    },
    order: ["wood-board", "cloth", "towel"],
  },
  "contact-area": {
    variableKey: "contactArea",
    baseline: {
      pressure: 2,
      surfacePreset: "wood-board",
      contactArea: "flat",
    },
    order: ["flat", "side"],
  },
};

export function createInitialClassroomSessionState(
  studyFactor: StudyFactor = DEFAULT_CLASSROOM_STUDY_FACTOR,
): ClassroomSessionState {
  const parameters = getRecommendedParametersForFactor(studyFactor);

  return {
    entry: DEFAULT_CLASSROOM_ENTRY_STATE,
    studyFactor,
    parameters,
    eligibility: "idle",
    isClassroomCandidate: isClassroomCandidateForFactor(studyFactor, parameters),
    recordsByFactor: createEmptyClassroomRecords(),
  };
}

export function getRecommendedParametersForFactor(
  studyFactor: StudyFactor,
): ClassroomParameters {
  return { ...CLASSROOM_FACTOR_CONFIG[studyFactor].baseline };
}

export function getClassroomVariableKey(
  studyFactor: StudyFactor,
): ClassroomVariableKey {
  return CLASSROOM_FACTOR_CONFIG[studyFactor].variableKey;
}

export function getClassroomGroupOrder(
  studyFactor: StudyFactor,
): ReadonlyArray<number | string> {
  return CLASSROOM_FACTOR_CONFIG[studyFactor].order;
}

export function isClassroomCandidateForFactor(
  studyFactor: StudyFactor,
  parameters: ClassroomParameters,
): boolean {
  const config = CLASSROOM_FACTOR_CONFIG[studyFactor];
  const baseline = config.baseline;

  if (config.variableKey !== "pressure" && parameters.pressure !== baseline.pressure) {
    return false;
  }

  if (
    config.variableKey !== "surfacePreset" &&
    parameters.surfacePreset !== baseline.surfacePreset
  ) {
    return false;
  }

  if (
    config.variableKey !== "contactArea" &&
    parameters.contactArea !== baseline.contactArea
  ) {
    return false;
  }

  return config.order.some((value) => value === parameters[config.variableKey]);
}

export function switchClassroomStudyFactor(
  state: ClassroomSessionState,
  studyFactor: StudyFactor,
): ClassroomSessionState {
  const parameters = getRecommendedParametersForFactor(studyFactor);

  return {
    ...state,
    studyFactor,
    parameters,
    eligibility: "idle",
    isClassroomCandidate: true,
  };
}

export function setClassroomMeasurementEligibility(
  state: ClassroomSessionState,
  eligibility: MeasurementEligibility,
): ClassroomSessionState {
  return {
    ...state,
    eligibility,
  };
}

export function updateClassroomParameters(
  state: ClassroomSessionState,
  patch: Partial<ClassroomParameters>,
): ClassroomSessionState {
  const nextParameters = {
    ...state.parameters,
    ...patch,
  };
  const parametersChanged =
    nextParameters.pressure !== state.parameters.pressure ||
    nextParameters.surfacePreset !== state.parameters.surfacePreset ||
    nextParameters.contactArea !== state.parameters.contactArea;

  if (!parametersChanged) {
    return state;
  }

  return {
    ...state,
    parameters: nextParameters,
    eligibility: getEligibilityAfterParameterChange(state.eligibility),
    isClassroomCandidate: isClassroomCandidateForFactor(state.studyFactor, nextParameters),
  };
}

export function recordClassroomMeasurement(
  state: ClassroomSessionState,
  measurement: ClassroomMeasurementInput,
): ClassroomSessionState {
  if (!state.isClassroomCandidate) {
    return state;
  }

  if (state.eligibility !== "recordable" && state.eligibility !== "recorded") {
    return state;
  }

  const nextRecord: ClassroomRecord = {
    factor: state.studyFactor,
    groupKey: getClassroomGroupKey(state.studyFactor, state.parameters),
    pressure: state.parameters.pressure,
    surfacePreset: state.parameters.surfacePreset,
    contactArea: state.parameters.contactArea,
    stablePullForce: measurement.stablePullForce,
    kineticFriction: measurement.kineticFriction,
    staticLimit: measurement.staticLimit,
  };
  const previousRecords = state.recordsByFactor[state.studyFactor];
  const filteredRecords = previousRecords.filter((record) => record.groupKey !== nextRecord.groupKey);
  const nextRecords = sortClassroomRecords(state.studyFactor, [...filteredRecords, nextRecord]);

  return {
    ...state,
    eligibility: "recorded",
    recordsByFactor: {
      ...state.recordsByFactor,
      [state.studyFactor]: nextRecords,
    },
  };
}

export function getClassroomGroupKey(
  studyFactor: StudyFactor,
  parameters: ClassroomParameters,
): string {
  const variableKey = getClassroomVariableKey(studyFactor);
  const variableValue = parameters[variableKey];
  return `${studyFactor}:${formatGroupValue(variableValue)}`;
}

function createEmptyClassroomRecords(): Record<StudyFactor, ClassroomRecord[]> {
  return {
    pressure: [],
    surface: [],
    "contact-area": [],
  };
}

function sortClassroomRecords(
  studyFactor: StudyFactor,
  records: ClassroomRecord[],
): ClassroomRecord[] {
  const config = CLASSROOM_FACTOR_CONFIG[studyFactor];

  return [...records].sort((left, right) => {
    const leftValue = left[config.variableKey];
    const rightValue = right[config.variableKey];
    const leftIndex = config.order.findIndex((value) => value === leftValue);
    const rightIndex = config.order.findIndex((value) => value === rightValue);

    if (leftIndex !== -1 || rightIndex !== -1) {
      return normalizeOrderIndex(leftIndex) - normalizeOrderIndex(rightIndex);
    }

    return String(leftValue).localeCompare(String(rightValue), "zh-CN");
  });
}

function getEligibilityAfterParameterChange(
  eligibility: MeasurementEligibility,
): MeasurementEligibility {
  if (eligibility === "recordable" || eligibility === "recorded") {
    return "invalidated";
  }

  return "idle";
}

function formatGroupValue(value: number | string) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(value).replace(/\.0+$/, "");
  }

  return value;
}

function normalizeOrderIndex(index: number) {
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}
