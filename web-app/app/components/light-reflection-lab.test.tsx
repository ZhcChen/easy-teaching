import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { LightReflectionLab } from "./light-reflection-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "light-reflection-lab");

  if (!foundTopic) {
    throw new Error("light-reflection-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <LightReflectionLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("LightReflectionLab", () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.removeItem("easy-teaching.light-reflection.panel-collapsed");
  });

  it("enters on the equal-angle step with recording locked", () => {
    renderLab();

    expect(screen.getByRole("button", { name: "等角性" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
    expect(screen.getAllByText("待观察").length).toBeGreaterThan(0);
  });

  it("only unlocks recording after the observation settles", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();
    expect(screen.getAllByText("现象稳定").length).toBeGreaterThan(0);
  });

  it("records the current step and advances to the next preset", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    expect(screen.getAllByText("1 / 4 组").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "共面性" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
  });

  it("invalidates the stable reading after changing the incident angle", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();

    fireEvent.change(screen.getByLabelText("入射角 ∠i"), {
      target: { value: "60" },
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
    expect(screen.getAllByText("待观察").length).toBeGreaterThan(0);
  });

  it("shows the diffuse reflection note after switching to the diffuse step", () => {
    renderLab();

    const diffuseStepButton = screen.getAllByRole("button", { name: "漫反射" })[0];
    fireEvent.click(diffuseStepButton);

    expect(screen.getAllByText("粗糙表面上各点法线不同，因此反射光线向各方向散开").length).toBeGreaterThan(0);
    expect(diffuseStepButton).toHaveAttribute("aria-pressed", "true");
  });
});
