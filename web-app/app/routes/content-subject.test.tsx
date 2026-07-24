import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { LocaleProvider } from "../i18n";
import ContentSubjectPage from "./content-subject";

function renderPage(stageId: string, subjectId: string) {
  const props = { params: { stageId, subjectId } } as Parameters<typeof ContentSubjectPage>[0];

  return render(
    <LocaleProvider>
      <MemoryRouter>
        <ContentSubjectPage {...props} />
      </MemoryRouter>
    </LocaleProvider>,
  );
}

describe("ContentSubjectPage topic delivery states", () => {
  it("marks implemented junior physics topics as directly available", () => {
    renderPage("junior", "physics");

    const motionTrackLink = screen.getByRole("link", { name: /速度与位移轨迹/i });
    const newtonLink = screen.getByRole("link", { name: /牛顿第一定律实验/i });
    const balanceLink = screen.getByRole("link", { name: /二力平衡条件探究/i });
    const pressureFactorsLink = screen.getByRole("link", { name: /压强影响因素实验/i });
    const circuitObserverLink = screen.getByRole("link", { name: /串并联电路观察/i });
    const reflectionLink = screen.getByRole("link", { name: /光的反射定律实验/i });
    const planeMirrorLink = screen.getByRole("link", { name: /平面镜成像实验/i });
    const evaporationLink = screen.getByRole("link", { name: /液体蒸发快慢影响因素/i });
    const ohmsLawLink = screen.getByRole("link", { name: /欧姆定律探究实验/i });

    expect(within(motionTrackLink).getByText("已可用")).toBeInTheDocument();
    expect(within(motionTrackLink).getByText("直接进入")).toBeInTheDocument();
    expect(within(motionTrackLink).getByText("优先开发")).toBeInTheDocument();
    expect(motionTrackLink).toHaveAttribute("href", "/visual/motion-track");

    expect(within(newtonLink).getByText("已可用")).toBeInTheDocument();
    expect(within(newtonLink).getByText("直接进入")).toBeInTheDocument();
    expect(within(newtonLink).getByText("优先开发")).toBeInTheDocument();
    expect(newtonLink).toHaveAttribute("href", "/visual/newton-first-law-lab");

    expect(within(balanceLink).getByText("已可用")).toBeInTheDocument();
    expect(within(balanceLink).getByText("直接进入")).toBeInTheDocument();
    expect(within(balanceLink).getByText("优先开发")).toBeInTheDocument();
    expect(balanceLink).toHaveAttribute("href", "/visual/two-force-balance-lab");

    expect(within(pressureFactorsLink).getByText("已可用")).toBeInTheDocument();
    expect(within(pressureFactorsLink).getByText("直接进入")).toBeInTheDocument();
    expect(within(pressureFactorsLink).getByText("优先开发")).toBeInTheDocument();
    expect(pressureFactorsLink).toHaveAttribute("href", "/visual/pressure-factors-lab");

    expect(within(circuitObserverLink).getByText("已可用")).toBeInTheDocument();
    expect(within(circuitObserverLink).getByText("直接进入")).toBeInTheDocument();

    expect(within(reflectionLink).getByText("已可用")).toBeInTheDocument();
    expect(within(reflectionLink).getByText("直接进入")).toBeInTheDocument();
    expect(within(reflectionLink).getByText("优先开发")).toBeInTheDocument();
    expect(reflectionLink).toHaveAttribute("href", "/visual/light-reflection-lab");

    expect(within(planeMirrorLink).getByText("已可用")).toBeInTheDocument();
    expect(within(planeMirrorLink).getByText("直接进入")).toBeInTheDocument();
    expect(within(planeMirrorLink).getByText("优先开发")).toBeInTheDocument();
    expect(planeMirrorLink).toHaveAttribute("href", "/visual/plane-mirror-lab");

    expect(within(evaporationLink).getByText("已可用")).toBeInTheDocument();
    expect(within(evaporationLink).getByText("直接进入")).toBeInTheDocument();
    expect(within(evaporationLink).getByText("优先开发")).toBeInTheDocument();
    expect(evaporationLink).toHaveAttribute("href", "/visual/evaporation-rate-lab");

    expect(within(ohmsLawLink).getByText("已可用")).toBeInTheDocument();
    expect(within(ohmsLawLink).getByText("直接进入")).toBeInTheDocument();
    expect(within(ohmsLawLink).getByText("优先开发")).toBeInTheDocument();
    expect(ohmsLawLink).toHaveAttribute("href", "/visual/ohms-law-lab");
  });

  it("surfaces the split light-propagation topics as real implemented labs", () => {
    renderPage("junior", "physics");

    const shadowLink = screen.getByRole("link", { name: /影子形成与本影半影/i });
    const pinholeLink = screen.getByRole("link", { name: /小孔成像规律观察/i });
    const eclipseLink = screen.getByRole("link", { name: /日食月食与光路可见性/i });

    expect(within(shadowLink).getByText("已可用")).toBeInTheDocument();
    expect(within(shadowLink).getByText("直接进入")).toBeInTheDocument();
    expect(within(shadowLink).getByText("优先开发")).toBeInTheDocument();
    expect(shadowLink).toHaveAttribute("href", "/visual/shadow-formation-lab");

    expect(within(pinholeLink).getByText("已可用")).toBeInTheDocument();
    expect(within(pinholeLink).getByText("直接进入")).toBeInTheDocument();
    expect(pinholeLink).toHaveAttribute("href", "/visual/pinhole-imaging-lab");

    expect(within(eclipseLink).getByText("已可用")).toBeInTheDocument();
    expect(within(eclipseLink).getByText("直接进入")).toBeInTheDocument();
    expect(eclipseLink).toHaveAttribute("href", "/visual/eclipse-scattering-lab");
  });

  it("marks the remaining junior word-backed topics as directly available", () => {
    renderPage("junior", "physics");

    const buoyancyLink = screen.getByRole("link", { name: /浮力与阿基米德原理/i });
    const lensLink = screen.getByRole("link", { name: /凸透镜成像规律/i });
    const refractionLink = screen.getByRole("link", { name: /光的折射规律/i });
    const meltingLink = screen.getByRole("link", { name: /晶体与非晶体熔化凝固/i });
    const resistorLink = screen.getByRole("link", { name: /滑动变阻器动态调压/i });

    expect(within(buoyancyLink).getByText("已可用")).toBeInTheDocument();
    expect(within(buoyancyLink).getByText("直接进入")).toBeInTheDocument();
    expect(buoyancyLink).toHaveAttribute("href", "/visual/buoyancy-lab");

    expect(within(lensLink).getByText("已可用")).toBeInTheDocument();
    expect(within(lensLink).getByText("直接进入")).toBeInTheDocument();
    expect(lensLink).toHaveAttribute("href", "/visual/lens-imaging-lab");

    expect(within(refractionLink).getByText("已可用")).toBeInTheDocument();
    expect(within(refractionLink).getByText("直接进入")).toBeInTheDocument();
    expect(refractionLink).toHaveAttribute("href", "/visual/light-refraction-lab");

    expect(within(meltingLink).getByText("已可用")).toBeInTheDocument();
    expect(within(meltingLink).getByText("直接进入")).toBeInTheDocument();
    expect(meltingLink).toHaveAttribute("href", "/visual/melting-freezing-lab");

    expect(within(resistorLink).getByText("已可用")).toBeInTheDocument();
    expect(within(resistorLink).getByText("直接进入")).toBeInTheDocument();
    expect(resistorLink).toHaveAttribute("href", "/visual/variable-resistor-lab");
  });

  it("distinguishes planned and backlog senior physics topics at the entry level", () => {
    renderPage("senior", "physics");

    const forceAnalysisLink = screen.getByRole("link", { name: /受力分析实验台/i });
    const electromagneticFieldLink = screen.getByRole("link", { name: /电场与磁场可视化/i });

    expect(within(forceAnalysisLink).getByText("规划中")).toBeInTheDocument();
    expect(within(forceAnalysisLink).getByText("查看规划")).toBeInTheDocument();
    expect(within(forceAnalysisLink).getByText("优先开发")).toBeInTheDocument();

    expect(within(electromagneticFieldLink).getAllByText("后续扩展").length).toBeGreaterThan(0);
    expect(within(electromagneticFieldLink).getByText("了解方向")).toBeInTheDocument();
  });
});
