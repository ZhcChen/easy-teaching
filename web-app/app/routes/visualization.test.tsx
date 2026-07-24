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

vi.mock("../components/buoyancy-lab", () => ({
  BuoyancyLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="buoyancy-lab">浮力实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/circuit-observer-lab", () => ({
  CircuitObserverLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="circuit-observer-lab">电路实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/eclipse-scattering-lab", () => ({
  EclipseScatteringLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="eclipse-scattering-lab">食相实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/evaporation-rate-lab", () => ({
  EvaporationRateLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="evaporation-rate-lab">蒸发实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/light-reflection-lab", () => ({
  LightReflectionLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="light-reflection-lab">反射实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/light-refraction-lab", () => ({
  LightRefractionLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="light-refraction-lab">折射实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/lens-imaging-lab", () => ({
  LensImagingLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="lens-imaging-lab">透镜实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/melting-freezing-lab", () => ({
  MeltingFreezingLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="melting-freezing-lab">熔化实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/motion-track-lab", () => ({
  MotionTrackLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="motion-track-lab">运动轨迹实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/newton-first-law-lab", () => ({
  NewtonFirstLawLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="newton-first-law-lab">牛顿实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/ohms-law-lab", () => ({
  OhmsLawLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="ohms-law-lab">欧姆实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/pinhole-imaging-lab", () => ({
  PinholeImagingLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="pinhole-imaging-lab">小孔实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/plane-mirror-lab", () => ({
  PlaneMirrorLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="plane-mirror-lab">平面镜实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/pressure-factors-lab", () => ({
  PressureFactorsLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="pressure-factors-lab">压强实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/shadow-formation-lab", () => ({
  ShadowFormationLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="shadow-formation-lab">影子实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/two-force-balance-lab", () => ({
  TwoForceBalanceLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="two-force-balance-lab">二力平衡实验页：{topic.title}</div>
  ),
}));

vi.mock("../components/variable-resistor-lab", () => ({
  VariableResistorLab: ({ topic }: { topic: { title: string } }) => (
    <div data-testid="variable-resistor-lab">滑变实验页：{topic.title}</div>
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

  it("routes implemented newton topics to the real newton lab component", () => {
    renderPage("newton-first-law-lab");

    expect(screen.getByTestId("newton-first-law-lab")).toHaveTextContent("牛顿第一定律实验");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented pressure topics to the real pressure lab component", () => {
    renderPage("pressure-factors-lab");

    expect(screen.getByTestId("pressure-factors-lab")).toHaveTextContent("压强影响因素实验");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented balance topics to the real balance lab component", () => {
    renderPage("two-force-balance-lab");

    expect(screen.getByTestId("two-force-balance-lab")).toHaveTextContent("二力平衡条件探究");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented buoyancy topics to the real buoyancy lab component", () => {
    renderPage("buoyancy-lab");

    expect(screen.getByTestId("buoyancy-lab")).toHaveTextContent("浮力与阿基米德原理");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented reflection topics to the real optics lab component", () => {
    renderPage("light-reflection-lab");

    expect(screen.getByTestId("light-reflection-lab")).toHaveTextContent("光的反射定律实验");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented plane-mirror topics to the real optics lab component", () => {
    renderPage("plane-mirror-lab");

    expect(screen.getByTestId("plane-mirror-lab")).toHaveTextContent("平面镜成像实验");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented shadow topics to the real optics lab component", () => {
    renderPage("shadow-formation-lab");

    expect(screen.getByTestId("shadow-formation-lab")).toHaveTextContent("影子形成与本影半影");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented pinhole topics to the real optics lab component", () => {
    renderPage("pinhole-imaging-lab");

    expect(screen.getByTestId("pinhole-imaging-lab")).toHaveTextContent("小孔成像规律观察");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented eclipse topics to the real optics lab component", () => {
    renderPage("eclipse-scattering-lab");

    expect(screen.getByTestId("eclipse-scattering-lab")).toHaveTextContent("日食月食与光路可见性");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented lens topics to the real optics lab component", () => {
    renderPage("lens-imaging-lab");

    expect(screen.getByTestId("lens-imaging-lab")).toHaveTextContent("凸透镜成像规律");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented refraction topics to the real optics lab component", () => {
    renderPage("light-refraction-lab");

    expect(screen.getByTestId("light-refraction-lab")).toHaveTextContent("光的折射规律");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented evaporation topics to the real thermo lab component", () => {
    renderPage("evaporation-rate-lab");

    expect(screen.getByTestId("evaporation-rate-lab")).toHaveTextContent("液体蒸发快慢影响因素");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented melting topics to the real thermo lab component", () => {
    renderPage("melting-freezing-lab");

    expect(screen.getByTestId("melting-freezing-lab")).toHaveTextContent("晶体与非晶体熔化凝固");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented ohms-law topics to the real electric lab component", () => {
    renderPage("ohms-law-lab");

    expect(screen.getByTestId("ohms-law-lab")).toHaveTextContent("欧姆定律探究实验");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("routes implemented variable-resistor topics to the real electric lab component", () => {
    renderPage("variable-resistor-lab");

    expect(screen.getByTestId("variable-resistor-lab")).toHaveTextContent("滑动变阻器动态调压");
    expect(screen.queryByRole("link", { name: "返回知识点页" })).not.toBeInTheDocument();
  });

  it("shows an honest planning state for senior topics that are not implemented yet", () => {
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
