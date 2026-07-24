import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { LensImagingLab } from "./lens-imaging-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "lens-imaging-lab");

  if (!foundTopic) {
    throw new Error("lens-imaging-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <LensImagingLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("LensImagingLab", () => {
  afterEach(() => {
    window.localStorage.removeItem("easy-teaching.lens-imaging.panel-collapsed");
  });

  it("starts on the u > 2f case", () => {
    renderLab();

    expect(screen.getAllByRole("button", { name: "u > 2f" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("实像区域").length).toBeGreaterThan(0);
  });

  it("switches to the virtual-image case inside the focal length", () => {
    renderLab();

    fireEvent.click(screen.getAllByRole("button", { name: "u < f" })[0]);

    expect(screen.getAllByRole("button", { name: "u < f" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("放大虚像").length).toBeGreaterThan(0);
  });
});
