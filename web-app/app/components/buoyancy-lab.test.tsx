import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { BuoyancyLab } from "./buoyancy-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "buoyancy-lab");

  if (!foundTopic) {
    throw new Error("buoyancy-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <BuoyancyLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("BuoyancyLab", () => {
  afterEach(() => {
    window.localStorage.removeItem("easy-teaching.buoyancy.panel-collapsed");
  });

  it("starts with the object weighed in air", () => {
    renderLab();

    expect(screen.getAllByRole("button", { name: "空气中称重" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("空气中称重").length).toBeGreaterThan(0);
  });

  it("predicts floating when the object weight becomes smaller than the maximum buoyancy", () => {
    renderLab();

    fireEvent.change(screen.getByLabelText("物体重力"), {
      target: { value: "0.8" },
    });

    expect(screen.getAllByText("若松手将上浮").length).toBeGreaterThan(0);
  });
});
