import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { EvaporationRateLab } from "./evaporation-rate-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "evaporation-rate-lab");

  if (!foundTopic) {
    throw new Error("evaporation-rate-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <EvaporationRateLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("EvaporationRateLab", () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.removeItem("easy-teaching.evaporation-rate.panel-collapsed");
  });

  it("enters on the temperature study with recording locked", () => {
    renderLab();

    expect(screen.getAllByRole("button", { name: "温度影响" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
    expect(screen.getAllByText("待观察").length).toBeGreaterThan(0);
  });

  it("unlocks recording after the observation settles", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();
    expect(screen.getAllByText("读数稳定").length).toBeGreaterThan(0);
  });

  it("records the current factor and advances to the next study step", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1300);
    });

    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    expect(screen.getAllByText("1 / 3 组").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "表面积影响" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
  });

  it("invalidates the stable reading after changing the studied variable", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();

    fireEvent.change(screen.getByLabelText("对比温度"), {
      target: { value: "70" },
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
    expect(screen.getAllByText("待观察").length).toBeGreaterThan(0);
  });

  it("switches to the wind study and keeps the other conditions fixed", () => {
    renderLab();

    fireEvent.click(screen.getAllByRole("button", { name: "风速影响" })[0]);

    expect(screen.getAllByRole("button", { name: "风速影响" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("对比风速")).toHaveValue("3");
    expect(screen.getByText("25 °C")).toBeInTheDocument();
    expect(screen.getByText("28 cm²")).toBeInTheDocument();
  });
});
