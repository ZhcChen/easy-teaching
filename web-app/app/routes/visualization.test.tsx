import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "../i18n";
import VisualizationPage from "./visualization";

vi.mock("../components/basic-force-lab", () => ({
  BasicForceLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="basic-force-lab">摩擦力实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/circuit-observer-lab", () => ({
  CircuitObserverLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="circuit-observer-lab">电路实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/motion-track-lab", () => ({
  MotionTrackLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="motion-track-lab">运动轨迹实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/pressure-factors-lab", () => ({
  PressureFactorsLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="pressure-factors-lab">压强实验页：{topic.title}</div>
  ),
}));

function renderPage(topicId: string) {
  const props = { params: { topicId } } as Parameters<typeof VisualizationPage>[0];

  return render(
    <LocaleProvider>
      <MemoryRouter>
        <VisualizationPage {...props} />
      </MemoryRouter>
    </LocaleProvider>,
  );
}

describe("VisualizationPage delivery routing", () => {
  it("keeps implemented topics on their real lab components and supports the old friction alias", () => {
    renderPage("basic-force");

    expect(screen.getByTestId("basic-force-lab")).toHaveTextContent("滑动摩擦力影响因素实验");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented motion topics to the real motion lab component", () => {
    renderPage("motion-track");

    expect(screen.getByTestId("motion-track-lab")).toHaveTextContent("速度与位移轨迹");
    expect(screen.queryByText("当前还没有真实实验页")).not.toBeInTheDocument();
  });

  it("routes implemented pressure topics to the real pressure lab component", () => {
    renderPage("pressure-factors-lab");

    expect(screen.getByTestId("pressure-factors-lab")).toHaveTextContent("压强影响因素实验");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("shows an honest planning state for topics that are not implemented yet", () => {
    renderPage("force-analysis");

    expect(screen.getByRole("heading", { name: "受力分析实验台" })).toBeInTheDocument();
    expect(screen.getAllByText("规划中").length).toBeGreaterThan(0);
    expect(screen.getByText(/当前还没有真实实验页，先保留为教学规划项。/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回知识点页" })).toHaveAttribute(
      "href",
      "/content/senior/physics",
    );
  });

  it("shows a backlog explanation instead of the old default tech shell", () => {
    renderPage("electromagnetic-field");

    expect(screen.getByRole("heading", { name: "电场与磁场可视化" })).toBeInTheDocument();
    expect(screen.getAllByText("后续扩展").length).toBeGreaterThan(0);
    expect(screen.getByText(/当前只保留主题方向说明，后续会结合课堂主线决定是否推进。/)).toBeInTheDocument();
    expect(screen.queryByText("参数层")).not.toBeInTheDocument();
  });

  it("keeps the unknown-topic error state unchanged", () => {
    renderPage("not-found-topic");

    expect(screen.getByRole("heading", { name: "这个可视化页面还没有准备好" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开知识库" })).toHaveAttribute("href", "/content");
  });
});
