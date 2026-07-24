import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { MeltingFreezingLab } from "./melting-freezing-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "melting-freezing-lab");

  if (!foundTopic) {
    throw new Error("melting-freezing-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <MeltingFreezingLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("MeltingFreezingLab", () => {
  afterEach(() => {
    window.localStorage.removeItem("easy-teaching.melting-freezing.panel-collapsed");
  });

  it("shows the crystal-melting plateau when the timeline reaches the middle segment", () => {
    renderLab();

    fireEvent.change(screen.getByLabelText("时间节点"), {
      target: { value: "5" },
    });

    expect(screen.getAllByText("固液共存").length).toBeGreaterThan(0);
  });

  it("marks the amorphous-melting scene as having no platform", () => {
    renderLab();

    fireEvent.click(screen.getAllByRole("button", { name: "非晶体熔化" })[0]);

    expect(screen.getAllByRole("button", { name: "非晶体熔化" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("无温度平台").length).toBeGreaterThan(0);
  });
});
