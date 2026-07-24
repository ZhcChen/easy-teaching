import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { EclipseScatteringLab } from "./eclipse-scattering-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "eclipse-scattering-lab");

  if (!foundTopic) {
    throw new Error("eclipse-scattering-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <EclipseScatteringLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("EclipseScatteringLab", () => {
  afterEach(() => {
    window.localStorage.removeItem("easy-teaching.eclipse-scattering.panel-collapsed");
  });

  it("starts on the solar-eclipse scene", () => {
    renderLab();

    expect(screen.getAllByRole("button", { name: "日食" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("遮挡形成影子").length).toBeGreaterThan(0);
  });

  it("shows a visible beam after switching to the scattering scene and increasing dust", () => {
    renderLab();

    fireEvent.click(screen.getAllByRole("button", { name: "光路可见" })[0]);
    fireEvent.change(screen.getByLabelText("烟雾 / 尘埃浓度"), {
      target: { value: "90" },
    });

    expect(screen.getAllByRole("button", { name: "光路可见" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("整条光束清晰可见").length).toBeGreaterThan(0);
  });
});
