import { describe, expect, it } from "vitest";

import {
  createInitialClassroomSessionState,
  recordClassroomMeasurement,
  setClassroomMeasurementEligibility,
  switchClassroomStudyFactor,
  updateClassroomParameters,
} from "./basic-force-lab-state";
import { deriveClassroomTeachingState } from "./basic-force-lab-teaching";

type ClassroomPatch = Parameters<typeof updateClassroomParameters>[1];

function recordRun(
  session: ReturnType<typeof createInitialClassroomSessionState>,
  patch: ClassroomPatch,
  kineticFriction: number,
) {
  const nextSession =
    Object.keys(patch).length === 0 ? session : updateClassroomParameters(session, patch);

  return recordClassroomMeasurement(
    setClassroomMeasurementEligibility(nextSession, "recordable"),
    {
      stablePullForce: kineticFriction,
      kineticFriction,
      staticLimit: kineticFriction + 0.3,
    },
  );
}

describe("basic-force-lab teaching derivations", () => {
  it("reveals the current-run principle after the first pressure record without giving a formal conclusion", () => {
    const session = recordRun(createInitialClassroomSessionState(), {}, 0.8);

    const teaching = deriveClassroomTeachingState({
      session,
      isTeachingMeasurementMode: true,
    });

    expect(teaching.stability.level).toBe("recordable");
    expect(teaching.stability.reason).toBe("recorded");
    expect(teaching.principleState).toBe("available");
    expect(teaching.activeFactor.conclusionLevel).toBe("none");
    expect(teaching.activeFactor.conclusion).toBeUndefined();
    expect(teaching.activeFactor.nextGroupKey).toBe("pressure:6");
    expect(teaching.activeFactor.missingGroupKeys).toEqual(["pressure:2", "pressure:6"]);
  });

  it("upgrades the pressure comparison to a formal classroom conclusion after 2N, 4N, and 6N are recorded", () => {
    let session = createInitialClassroomSessionState();
    session = recordRun(session, { pressure: 2 }, 0.4);
    session = recordRun(session, { pressure: 4 }, 0.8);
    session = recordRun(session, { pressure: 6 }, 1.2);

    const teaching = deriveClassroomTeachingState({
      session,
      isTeachingMeasurementMode: true,
    });

    expect(teaching.principleState).toBe("formal");
    expect(teaching.activeFactor.completedCount).toBe(3);
    expect(teaching.activeFactor.conclusionLevel).toBe("formal");
    expect(teaching.activeFactor.conclusion).toMatchObject({
      level: "formal",
      key: "pressure-increase",
    });
    expect(teaching.activeFactor.nextGroupKey).toBeUndefined();
  });

  it("suggests the missing contact-area comparison after only one classroom record", () => {
    let session = switchClassroomStudyFactor(
      createInitialClassroomSessionState(),
      "contact-area",
    );
    session = recordRun(session, {}, 0.6);

    const teaching = deriveClassroomTeachingState({
      session,
      isTeachingMeasurementMode: true,
    });

    expect(teaching.principleState).toBe("available");
    expect(teaching.activeFactor.completedCount).toBe(1);
    expect(teaching.activeFactor.conclusionLevel).toBe("none");
    expect(teaching.activeFactor.nextGroupKey).toBe("contact-area:side");
    expect(teaching.activeFactor.missingGroupKeys).toEqual(["contact-area:side"]);
  });

  it("drops back to a remeasure state as soon as the study parameter changes", () => {
    const session = updateClassroomParameters(
      recordRun(createInitialClassroomSessionState(), {}, 0.8),
      { pressure: 6 },
    );

    const teaching = deriveClassroomTeachingState({
      session,
      isTeachingMeasurementMode: true,
    });

    expect(teaching.stability.level).toBe("building");
    expect(teaching.stability.reason).toBe("invalidated");
    expect(teaching.canRecordCurrentMeasurement).toBe(false);
    expect(teaching.principleState).toBe("hidden");
    expect(teaching.activeFactor.nextGroupKey).toBe("pressure:6");
  });

  it("suppresses classroom conclusions and next-step guidance in extended modes", () => {
    let session = createInitialClassroomSessionState();
    session = recordRun(session, { pressure: 2 }, 0.4);
    session = recordRun(session, { pressure: 4 }, 0.8);

    const teaching = deriveClassroomTeachingState({
      session,
      isTeachingMeasurementMode: false,
    });

    expect(teaching.stability.reason).toBe("extended");
    expect(teaching.principleState).toBe("hidden");
    expect(teaching.activeFactor.conclusionLevel).toBe("none");
    expect(teaching.activeFactor.conclusion).toBeUndefined();
    expect(teaching.activeFactor.nextGroupKey).toBeUndefined();
  });
});
