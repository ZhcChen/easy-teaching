import type { ReactNode, RefObject } from "react";

import { useLocale } from "../i18n";
import { usePersistentPanelCollapsed } from "./teaching-lab-storage";

type TeachingLabShellProps = {
  panelStorageKey: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
  fullscreenRef: RefObject<HTMLDivElement | null>;
  controlTitle: string;
  controlCopy: string;
  statusItems: ReactNode[];
  controlContent: ReactNode;
  stageContent: ReactNode;
  rootClassName?: string;
  layoutClassName?: string;
  panelClassName?: string;
  mainClassName?: string;
};

export function TeachingLabShell({
  panelStorageKey,
  isFullscreen,
  onToggleFullscreen,
  fullscreenRef,
  controlTitle,
  controlCopy,
  statusItems,
  controlContent,
  stageContent,
  rootClassName,
  layoutClassName,
  panelClassName,
  mainClassName,
}: TeachingLabShellProps) {
  const { tt } = useLocale();
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] =
    usePersistentPanelCollapsed(panelStorageKey);

  const layoutClass = [
    "force-lab-layout",
    "teaching-lab-layout",
    isControlPanelCollapsed ? "is-collapsed" : "",
    layoutClassName ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const panelClass = [
    "force-control-panel",
    "teaching-control-panel",
    isControlPanelCollapsed ? "is-collapsed" : "",
    panelClassName ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const mainClass = [
    "force-lab-main",
    "teaching-lab-main",
    mainClassName ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      ref={fullscreenRef}
      className={["visual-shell", "force-lab-shell", rootClassName ?? ""].filter(Boolean).join(" ")}
    >
      <div className={layoutClass}>
        <aside className={panelClass}>
          {isControlPanelCollapsed ? (
            <div className="force-panel-collapsed-shell">
              <button
                type="button"
                className="force-panel-toggle is-collapsed-only"
                onClick={() => setIsControlPanelCollapsed(false)}
                aria-label={tt("展开控制面板")}
                title={tt("展开控制面板")}
              >
                <PanelChevronIcon collapsed />
              </button>
            </div>
          ) : (
            <>
              <div className="force-control-header">
                <div className="force-control-title-block">
                  <h4 className="force-control-title">{controlTitle}</h4>
                  <p className="force-control-copy">{controlCopy}</p>
                </div>
                <button
                  type="button"
                  className="force-panel-toggle"
                  onClick={() => setIsControlPanelCollapsed(true)}
                  aria-label={tt("收起控制面板")}
                  title={tt("收起控制面板")}
                >
                  <PanelChevronIcon collapsed={false} />
                </button>
              </div>

              <div className="force-control-scroll">{controlContent}</div>
            </>
          )}
        </aside>

        <div className={mainClass}>
          <div className="force-toolbar">
            <div className="force-toolbar-status">{statusItems}</div>
            <div className="force-toolbar-actions">
              <button
                type="button"
                onClick={() => {
                  void onToggleFullscreen();
                }}
                className="fullscreen-button is-compact"
                aria-label={isFullscreen ? tt("退出全屏") : tt("进入全屏")}
                title={isFullscreen ? tt("退出全屏") : tt("进入全屏")}
              >
                {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
              </button>
            </div>
          </div>

          {stageContent}
        </div>
      </div>
    </section>
  );
}

function PanelChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      {collapsed ? (
        <path d="M9 6 15 12 9 18" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M15 6 9 12 15 18" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 4H4v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 4h5v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v5h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9 9 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m15 4 5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m20 15-5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9 20-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CollapseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 9 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9V4h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m15 9 5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 4h5v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9 15-5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v5h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m15 15 5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 20h5v-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
