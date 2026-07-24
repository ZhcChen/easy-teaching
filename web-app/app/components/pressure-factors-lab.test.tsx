import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { PressureFactorsLab } from "./pressure-factors-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "pressure-factors-lab");

  if (!foundTopic) {
    throw new Error("pressure-factors-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <PressureFactorsLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("PressureFactorsLab", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("enters with the pressure study flow expanded and recording locked", () => {
    renderLab();

    expect(screen.getByRole("button", { name: "收起控制面板" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "压力" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
    expect(screen.getAllByText("压力对照").length).toBeGreaterThan(0);
  });

  it("only unlocks recording after the observation settles", () => {
    vi.useFakeTimers();

    renderLab();

    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(520);
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();
    expect(screen.getAllByText("读数稳定").length).toBeGreaterThan(0);
  });

  it("records the current load group and jumps to the next pending load", () => {
    vi.useFakeTimers();

    renderLab();

    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));
    act(() => {
      vi.advanceTimersByTime(520);
    });
    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    expect(screen.getAllByText("1 / 3 组").length).toBeGreaterThan(0);
    expect(screen.getAllByText("压力 5 N").length).toBeGreaterThan(0);
    expect(screen.getByText("当前组：压力 10 N")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
  });

  it("switches to the area comparison flow with the fixed 5 N classroom baseline", () => {
    renderLab();

    fireEvent.click(screen.getByRole("button", { name: "受力面积" }));

    expect(screen.getByRole("button", { name: "受力面积" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("slider", { name: "当前压力" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "小桌正放" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("保持压力 5 N").length).toBeGreaterThan(0);
  });

  it("finishes the area comparison and surfaces the classroom conclusion", () => {
    vi.useFakeTimers();

    renderLab();

    fireEvent.click(screen.getByRole("button", { name: "受力面积" }));

    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));
    act(() => {
      vi.advanceTimersByTime(520);
    });
    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));
    act(() => {
      vi.advanceTimersByTime(520);
    });
    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    expect(screen.getAllByText("2 / 2 组").length).toBeGreaterThan(0);
    expect(
      screen.getByText("课堂结论：压力不变时，受力面积越小，压强越大，海绵形变越明显。"),
    ).toBeInTheDocument();
  });
});
