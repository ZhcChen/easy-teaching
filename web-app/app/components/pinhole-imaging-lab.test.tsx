import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { PinholeImagingLab } from "./pinhole-imaging-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "pinhole-imaging-lab");

  if (!foundTopic) {
    throw new Error("pinhole-imaging-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <PinholeImagingLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("PinholeImagingLab", () => {
  afterEach(() => {
    window.localStorage.removeItem("easy-teaching.pinhole-imaging.panel-collapsed");
  });

  it("starts on the object-distance step", () => {
    renderLab();

    expect(screen.getAllByRole("button", { name: "改变物距" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("倒立实像").length).toBeGreaterThan(0);
  });

  it("records the current run and advances to the screen-distance preset", () => {
    renderLab();

    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    expect(screen.getAllByText("1 / 3").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "改变像距" })[0]).toHaveAttribute("aria-pressed", "true");
  });
});
