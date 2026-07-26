import { useLocale } from "../i18n";

type FullscreenToggleButtonProps = {
  isFullscreen: boolean;
  onToggle: () => void | Promise<void>;
  variant?: "floating" | "compact";
  className?: string;
};

export function FullscreenToggleButton({
  isFullscreen,
  onToggle,
  variant = "compact",
  className,
}: FullscreenToggleButtonProps) {
  const { tt } = useLocale();

  const buttonClassName = [
    "fullscreen-button",
    variant === "floating" ? "is-floating" : "is-compact",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      onClick={() => {
        void onToggle();
      }}
      className={buttonClassName}
      aria-label={isFullscreen ? tt("退出全屏") : tt("进入全屏")}
      title={isFullscreen ? tt("退出全屏") : tt("进入全屏")}
    >
      {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
    </button>
  );
}

function ExpandIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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

function CollapseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
