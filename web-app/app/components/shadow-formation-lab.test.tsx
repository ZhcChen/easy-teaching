import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { ShadowFormationLab } from "./shadow-formation-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "shadow-formation-lab");

  if (!foundTopic) {
    throw new Error("shadow-formation-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <ShadowFormationLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("ShadowFormationLab", () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.removeItem("easy-teaching.shadow-formation.panel-collapsed");
  });

  it("enters on the point-source step with recording locked", () => {
    renderLab();

    expect(screen.getByRole("button", { name: "点光源影子" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
    expect(screen.getAllByText("待观察").length).toBeGreaterThan(0);
  });

  it("unlocks recording after the observation settles", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();
    expect(screen.getAllByText("现象稳定").length).toBeGreaterThan(0);
  });

  it("records the current step and advances to the area-source preset", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    expect(screen.getAllByText("1 / 4 组").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "本影与半影" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
  });

  it("invalidates the stable reading after changing the screen distance", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();

    fireEvent.change(screen.getByLabelText("光屏距物体"), {
      target: { value: "20" },
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
    expect(screen.getAllByText("待观察").length).toBeGreaterThan(0);
  });

  it("shows the umbra and penumbra scene after switching to the area-source step", () => {
    renderLab();

    fireEvent.click(screen.getByRole("button", { name: "本影与半影" }));

    expect(screen.getByRole("button", { name: "本影与半影" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("本影").length).toBeGreaterThan(0);
    expect(screen.getAllByText("半影").length).toBeGreaterThan(0);
  });
});
