import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { teachingStages } from "../data/teaching-catalog";
import { LocaleProvider } from "../i18n";
import { BasicForceLab } from "./basic-force-lab";

const topic = (() => {
  const foundTopic = teachingStages
    .flatMap((stage) => stage.subjects)
    .flatMap((subject) => subject.topics)
    .find((item) => item.id === "sliding-friction-lab");

  if (!foundTopic) {
    throw new Error("sliding-friction-lab topic not found");
  }

  return foundTopic;
})();

function renderLab() {
  return render(
    <LocaleProvider>
      <BasicForceLab
        topic={topic}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        fullscreenRef={createRef<HTMLDivElement>()}
      />
    </LocaleProvider>,
  );
}

describe("BasicForceLab classroom entry", () => {
  it("always enters in expanded 2D classroom mode", () => {
    window.localStorage.setItem("easy-teaching.basic-force.view-mode", "3d");
    window.localStorage.setItem("easy-teaching.basic-force.panel-collapsed", "1");

    renderLab();

    expect(screen.getByRole("button", { name: "收起控制面板" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "2D" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "3D" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("heading", { name: "主流程" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "辅助操作" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "阶段 4：匀速测量" })).toHaveLength(1);
  });

  it("keeps the full friction formula hidden before the first classroom record", () => {
    renderLab();

    expect(screen.queryByText("2. f = μN")).not.toBeInTheDocument();
  });

  it("switches to the recommended baseline when changing study factor", () => {
    renderLab();

    fireEvent.click(screen.getByRole("button", { name: "接触材质" }));

    expect(screen.getByRole("heading", { name: "接触材质" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "压力 / 正压力" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "摆放方式" })).not.toBeInTheDocument();
    expect(screen.getAllByText("普通木板").length).toBeGreaterThan(0);
    expect(screen.getAllByText("正放").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/压力 2 N/).length).toBeGreaterThan(0);
  });

  it("only enables manual classroom recording after the reading reaches the uniform stage", () => {
    renderLab();

    const recordButton = screen.getByRole("button", { name: "记录本组" });
    expect(recordButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "阶段 4：匀速测量" }));

    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();
    expect(
      screen.getAllByText("读数已经稳定，现在点击“记录本组”，再继续下一组对照。")
        .length,
    ).toBeGreaterThan(0);
  });

  it("invalidates the current stable reading after changing the study parameter", () => {
    renderLab();

    fireEvent.click(screen.getByRole("button", { name: "阶段 4：匀速测量" }));
    expect(screen.getByRole("button", { name: "记录本组" })).toBeEnabled();

    fireEvent.change(screen.getByLabelText("当前压力"), {
      target: { value: "6" },
    });

    expect(screen.getByRole("button", { name: "记录本组" })).toBeDisabled();
    expect(
      screen.getAllByText("参数刚刚变化，上一轮稳定读数已失效，请重新开始测量。")
        .length,
    ).toBeGreaterThan(0);
  });

  it("records the current classroom run into the grouped comparison table", () => {
    renderLab();

    fireEvent.click(screen.getByRole("button", { name: "阶段 4：匀速测量" }));
    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    expect(screen.getByRole("button", { name: "更新本组" })).toBeEnabled();
    expect(screen.getAllByText("压力 4 N").length).toBeGreaterThan(0);
    expect(screen.getByText("1 / 3 组")).toBeInTheDocument();
  });

  it("keeps extended observation in the auxiliary area and can return to the main flow", () => {
    renderLab();

    fireEvent.click(screen.getByRole("button", { name: "恒力拉动" }));

    expect(screen.getByRole("button", { name: "返回主流程" })).toBeInTheDocument();
    expect(
      screen.getAllByText("当前处于扩展观察模式。这里不会自动写入课堂记录，请返回“主流程”继续。")
        .length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "返回主流程" }));

    expect(screen.queryByRole("button", { name: "返回主流程" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "记录本组" })).toBeInTheDocument();
  });

  it("promotes the pressure comparison to a formal classroom conclusion after three runs", () => {
    renderLab();

    fireEvent.change(screen.getByLabelText("当前压力"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "阶段 4：匀速测量" }));
    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    fireEvent.change(screen.getByLabelText("当前压力"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "阶段 4：匀速测量" }));
    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    fireEvent.change(screen.getByLabelText("当前压力"), {
      target: { value: "6" },
    });
    fireEvent.click(screen.getByRole("button", { name: "阶段 4：匀速测量" }));
    fireEvent.click(screen.getByRole("button", { name: "记录本组" }));

    expect(
      screen.getAllByText("课堂结论：保持材质和摆放不变时，压力越大，滑动摩擦力越大。")
        .length,
    ).toBeGreaterThan(0);
  });
});
