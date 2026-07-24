import { describe, expect, it } from "vitest";

import {
  createInitialClassroomSessionState,
  recordClassroomMeasurement,
  setClassroomMeasurementEligibility,
  switchClassroomStudyFactor,
  updateClassroomParameters,
} from "./basic-force-lab-state";

describe("basic-force-lab classroom state", () => {
  it("uses the classroom default entry state", () => {
    const session = createInitialClassroomSessionState();

    expect(session.entry.viewMode).toBe("2d");
    expect(session.entry.mode).toBe("measurement");
    expect(session.entry.isControlPanelCollapsed).toBe(false);
    expect(session.studyFactor).toBe("pressure");
    expect(session.parameters).toEqual({
      pressure: 4,
      surfacePreset: "wood-board",
      contactArea: "flat",
    });
  });

  it("switches study factor back to the recommended baseline", () => {
    const session = switchClassroomStudyFactor(
      createInitialClassroomSessionState(),
      "surface",
    );

    expect(session.parameters).toEqual({
      pressure: 2,
      surfacePreset: "wood-board",
      contactArea: "flat",
    });
    expect(session.isClassroomCandidate).toBe(true);
  });

  it("overwrites the same classroom row when recorded twice", () => {
    let session = createInitialClassroomSessionState();

    session = setClassroomMeasurementEligibility(session, "recordable");
    session = recordClassroomMeasurement(session, {
      stablePullForce: 0.8,
      kineticFriction: 0.8,
      staticLimit: 1.1,
    });
    session = setClassroomMeasurementEligibility(session, "recordable");
    session = recordClassroomMeasurement(session, {
      stablePullForce: 0.9,
      kineticFriction: 0.9,
      staticLimit: 1.2,
    });

    expect(session.recordsByFactor.pressure).toHaveLength(1);
    expect(session.recordsByFactor.pressure[0]).toMatchObject({
      groupKey: "pressure:4",
      kineticFriction: 0.9,
      staticLimit: 1.2,
      stablePullForce: 0.9,
    });
    expect(session.eligibility).toBe("recorded");
  });

  it("invalidates a stable reading after parameters change", () => {
    const session = updateClassroomParameters(
      setClassroomMeasurementEligibility(createInitialClassroomSessionState(), "recordable"),
      { pressure: 6 },
    );

    expect(session.parameters.pressure).toBe(6);
    expect(session.eligibility).toBe("invalidated");
  });
});
