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
    const pressureFactorsLink = screen.getByRole("link", { name: /压强影响因素实验/i });
    const circuitObserverLink = screen.getByRole("link", { name: /串并联电路观察/i });

    expect(within(motionTrackLink).getByText("已可用")).toBeInTheDocument();
    expect(within(motionTrackLink).getByText("直接进入")).toBeInTheDocument();
    expect(within(motionTrackLink).getByText("优先开发")).toBeInTheDocument();
    expect(motionTrackLink).toHaveAttribute("href", "/visual/motion-track");

    expect(within(pressureFactorsLink).getByText("已可用")).toBeInTheDocument();
    expect(within(pressureFactorsLink).getByText("直接进入")).toBeInTheDocument();
    expect(within(pressureFactorsLink).getByText("优先开发")).toBeInTheDocument();
    expect(pressureFactorsLink).toHaveAttribute("href", "/visual/pressure-factors-lab");

    expect(within(circuitObserverLink).getByText("已可用")).toBeInTheDocument();
    expect(within(circuitObserverLink).getByText("直接进入")).toBeInTheDocument();
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
