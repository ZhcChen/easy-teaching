import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { LightRefractionLab } from "./light-refraction-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "light-refraction-lab");

  if (!foundTopic) {
    throw new Error("light-refraction-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <LightRefractionLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("LightRefractionLab", () => {
  afterEach(() => {
    window.localStorage.removeItem("easy-teaching.light-refraction.panel-collapsed");
  });

  it("starts on the air-to-water scene", () => {
    renderLab();

    expect(screen.getAllByRole("button", { name: "空气→水" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("向法线偏折").length).toBeGreaterThan(0);
  });

  it("shows total internal reflection on the dedicated step", () => {
    renderLab();

    fireEvent.click(screen.getAllByRole("button", { name: "全反射" })[0]);

    expect(screen.getAllByRole("button", { name: "全反射" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("只反射，不折射").length).toBeGreaterThan(0);
  });
});
