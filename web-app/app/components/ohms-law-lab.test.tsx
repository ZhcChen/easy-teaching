import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { OhmsLawLab } from "./ohms-law-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "ohms-law-lab");

  if (!foundTopic) {
    throw new Error("ohms-law-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <OhmsLawLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("OhmsLawLab", () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.removeItem("easy-teaching.ohms-law.panel-collapsed");
  });

  it("enters on the fixed-resistance I-U mode with recording locked", () => {
    renderLab();

    expect(screen.getAllByRole("button", { name: "R 一定：I-U" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
    expect(screen.getAllByText("待观察").length).toBeGreaterThan(0);
  });

  it("unlocks recording after the observation settles", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();
    expect(screen.getAllByText("读数稳定").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.20 A").length).toBeGreaterThan(0);
  });

  it("records the current voltage run and advances to the next preset", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    expect(screen.getAllByText("1 / 4 组").length).toBeGreaterThan(0);
    expect(screen.getByRole("slider", { name: "电压 U" })).toHaveValue("4");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
  });

  it("invalidates the stable reading after changing the current variable", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();

    fireEvent.change(screen.getByLabelText("电压 U"), {
      target: { value: "4" },
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
    expect(screen.getAllByText("待观察").length).toBeGreaterThan(0);
  });

  it("switches to fixed-voltage I-R mode and keeps voltage locked at 6 V", () => {
    renderLab();

    fireEvent.click(screen.getAllByRole("button", { name: "U 一定：I-R" })[0]);

    expect(screen.getAllByRole("button", { name: "U 一定：I-R" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("slider", { name: "电阻 R" })).toHaveValue("5");
    expect(screen.getAllByText("保持 U = 6 V 不变").length).toBeGreaterThan(0);
    expect(screen.getAllByText("6 V").length).toBeGreaterThan(0);
  });
});
