import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { NewtonFirstLawLab } from "./newton-first-law-lab";

vi.mock("./newton-first-law-three-stage", () => ({
  NewtonFirstLawThreeStage: () => (
    <div data-testid="newton-three-stage">3D Newton Stage</div>
  ),
}));

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "newton-first-law-lab");

  if (!foundTopic) {
    throw new Error("newton-first-law-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <NewtonFirstLawLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("NewtonFirstLawLab", () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.removeItem("easy-teaching.newton-first-law.view-mode");
    window.localStorage.removeItem("easy-teaching.newton-first-law.panel-collapsed");
  });

  it("starts in 2D and can switch to 3D mode", () => {
    renderLab();

    expect(screen.getByRole("tab", { name: "2D" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "3D" })).toHaveAttribute("aria-selected", "false");

    fireEvent.click(screen.getByRole("tab", { name: "3D" }));

    expect(screen.getByRole("tab", { name: "3D" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("newton-three-stage")).toBeInTheDocument();
  });

  it("enters with the towel surface selected and recording locked", () => {
    renderLab();

    expect(screen.getByRole("button", { name: "毛巾面" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "开始释放" })).toBeInTheDocument();
  });

  it("unlocks recording after the current release finishes", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始释放" }));

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();
    expect(screen.getAllByText("本次滑行完成").length).toBeGreaterThan(0);
  });

  it("records the current surface and advances to the next pending surface", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始释放" }));

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    expect(screen.getAllByText("1 / 4 组").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "棉布面" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
  });

  it("clears existing records after changing the initial velocity", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始释放" }));

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));
    expect(screen.getAllByText("1 / 4 组").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("初速度"), {
      target: { value: "2.1" },
    });

    expect(screen.queryByText("1 / 4 组")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
  });

  it("completes all four surfaces and shows the inertia conclusion", () => {
    vi.useFakeTimers();

    renderLab();

    const durations = [1600, 2200, 2900, 2900];

    for (const duration of durations) {
      fireEvent.click(screen.getByRole("button", { name: "开始释放" }));
      act(() => {
        vi.advanceTimersByTime(duration);
      });
      fireEvent.click(screen.getByRole("button", { name: /记录本组|更新本组/ }));
    }

    expect(screen.getAllByText("4 / 4 组").length).toBeGreaterThan(0);
    expect(
      screen.getByText("课堂结论：阻力越小，小车滑行越远；当阻力趋近 0 时，小车将保持匀速直线运动。"),
    ).toBeInTheDocument();
  });
});
