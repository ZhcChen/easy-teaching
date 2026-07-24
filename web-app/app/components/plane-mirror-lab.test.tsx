import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { PlaneMirrorLab } from "./plane-mirror-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "plane-mirror-lab");

  if (!foundTopic) {
    throw new Error("plane-mirror-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <PlaneMirrorLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("PlaneMirrorLab", () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.removeItem("easy-teaching.plane-mirror.panel-collapsed");
  });

  it("enters on the locating step with recording locked", () => {
    renderLab();

    expect(screen.getByRole("button", { name: "找像定位" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
    expect(screen.getAllByText("待观察").length).toBeGreaterThan(0);
  });

  it("unlocks recording after candle B is aligned and the observation settles", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.change(screen.getByLabelText("蜡烛 B 偏移"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();
    expect(screen.getAllByText("现象稳定").length).toBeGreaterThan(0);
  });

  it("records the locating step and advances to equal-distance mode", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.change(screen.getByLabelText("蜡烛 B 偏移"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    expect(screen.getAllByText("1 / 4 组").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "等距等大" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
  });

  it("keeps image distance equal to object distance after changing the object distance", () => {
    renderLab();

    fireEvent.click(screen.getByRole("button", { name: "等距等大" }));
    fireEvent.change(screen.getByLabelText("物距 u"), {
      target: { value: "22" },
    });

    expect(screen.getAllByText("22 cm").length).toBeGreaterThan(1);
    expect(screen.getByText("v = u = 22 cm · h′ = h = 18 cm")).toBeInTheDocument();
  });

  it("supports the virtual-image step once the screen is aligned", () => {
    vi.useFakeTimers();

    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "虚像验证" }));
    fireEvent.change(screen.getByLabelText("光屏偏移"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "开始观察" }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();
    expect(screen.getAllByText("屏上无像").length).toBeGreaterThan(0);
  });
});
