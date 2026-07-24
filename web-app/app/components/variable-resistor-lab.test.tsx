import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { VariableResistorLab } from "./variable-resistor-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "variable-resistor-lab");

  if (!foundTopic) {
    throw new Error("variable-resistor-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <VariableResistorLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("VariableResistorLab", () => {
  afterEach(() => {
    window.localStorage.removeItem("easy-teaching.variable-resistor.panel-collapsed");
  });

  it("starts on the A-C correct wiring scene", () => {
    renderLab();

    expect(screen.getAllByRole("button", { name: "A-C 正接" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("滑片右移：电阻增大").length).toBeGreaterThan(0);
  });

  it("shows overcurrent risk for the C-D two-lower wiring", () => {
    renderLab();

    fireEvent.click(screen.getAllByRole("button", { name: "C-D 两下" })[0]);

    expect(screen.getAllByRole("button", { name: "C-D 两下" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("过流风险，需保护电路").length).toBeGreaterThan(0);
  });
});
