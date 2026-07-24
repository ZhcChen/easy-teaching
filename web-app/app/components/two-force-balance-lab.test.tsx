import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { TwoForceBalanceLab } from "./two-force-balance-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "two-force-balance-lab");

  if (!foundTopic) {
    throw new Error("two-force-balance-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <TwoForceBalanceLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("TwoForceBalanceLab", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("enters on the balanced baseline and keeps recording locked", () => {
    renderLab();

    expect(screen.getByRole("button", { name: "平衡基线" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
    expect(screen.getAllByText("四个条件都满足，物体保持平衡。").length).toBeGreaterThan(0);
  });

  it("only unlocks recording after the observation settles", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始验证" }));

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();
    expect(screen.getAllByText("平衡成立").length).toBeGreaterThan(0);
  });

  it("records the current step and advances to the next preset", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始验证" }));

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    expect(screen.getAllByText("1 / 5 组").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "大小不等" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
  });

  it("invalidates the stable reading after changing a force parameter", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始验证" }));

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();

    fireEvent.change(screen.getByLabelText("右侧拉力 F2"), {
      target: { value: "6.5" },
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
    expect(screen.getAllByText("待验证").length).toBeGreaterThan(0);
  });

  it("shows the final classroom conclusion after all five validation steps", () => {
    vi.useFakeTimers();

    renderLab();

    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "开始验证" }));
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      fireEvent.click(screen.getByRole("button", { name: /记录本组|更新本组/ }));
    }

    expect(screen.getAllByText("5 / 5 组").length).toBeGreaterThan(0);
    expect(
      screen.getByText("课堂结论：只有当两个力作用在同一物体上、大小相等、方向相反、并且在同一直线上时，物体才处于二力平衡。"),
    ).toBeInTheDocument();
  });
});
