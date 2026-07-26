import type { ReactNode, RefObject } from "react";

import { useLocale } from "../i18n";
import { FullscreenToggleButton } from "./fullscreen-toggle-button";
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
              <FullscreenToggleButton
                isFullscreen={isFullscreen}
                onToggle={onToggleFullscreen}
                variant="compact"
              />
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
