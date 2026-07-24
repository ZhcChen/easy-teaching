import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { BasicForceLab } from "./basic-force-lab";

const topic = teachingStages
  .flatMap((stage) => stage.subjects)
  .flatMap((subject) => subject.topics)
  .find((item) => item.id === "sliding-friction-lab");

if (!topic) {
  throw new Error("sliding-friction-lab topic not found");
}

describe("BasicForceLab classroom entry", () => {
  it("always enters in expanded 2D classroom mode", () => {
    window.localStorage.setItem("easy-teaching.basic-force.view-mode", "3d");
    window.localStorage.setItem("easy-teaching.basic-force.panel-collapsed", "1");

    render(
      <LocaleProvider>
        <BasicForceLab
          topic={topic}
          isFullscreen={false}
          onToggleFullscreen={() => {}}
          fullscreenRef={createRef<HTMLDivElement>()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByRole("button", { name: "收起控制面板" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "2D" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "3D" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("heading", { name: "课堂实验" })).toBeInTheDocument();
  });

  it("switches to the recommended baseline when changing study factor", () => {
    render(
      <LocaleProvider>
        <BasicForceLab
          topic={topic}
          isFullscreen={false}
          onToggleFullscreen={() => {}}
          fullscreenRef={createRef<HTMLDivElement>()}
        />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "接触材质" }));

    expect(screen.getByRole("heading", { name: "接触材质" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "压力 / 正压力" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "摆放方式" })).not.toBeInTheDocument();
    expect(screen.getAllByText("普通木板").length).toBeGreaterThan(0);
    expect(screen.getAllByText("正放").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/压力 2 N/).length).toBeGreaterThan(0);
  });
});
