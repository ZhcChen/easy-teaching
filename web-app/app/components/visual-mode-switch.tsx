import type { CSSProperties } from "react";

type VisualModeOption = {
  key: string;
  label: string;
  title?: string;
};

type VisualModeSwitchProps = {
  value: string;
  options: VisualModeOption[];
  className?: string;
  onChange: (nextValue: string) => void;
};

export function VisualModeSwitch({
  value,
  options,
  className,
  onChange,
}: VisualModeSwitchProps) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.key === value),
  );
  const trackClassName = [
    "visual-mode-track",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={trackClassName}
      role="tablist"
      aria-label="可视化模式切换"
      style={
        {
          "--switch-count": options.length,
          "--switch-active-index": activeIndex,
        } as CSSProperties
      }
    >
      <span className="visual-mode-thumb" aria-hidden="true" />
      {options.map((option) => {
        const buttonClassName = [
          "visual-mode-button",
          value === option.key ? "is-active" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={option.key}
            type="button"
            className={buttonClassName}
            role="tab"
            aria-selected={value === option.key}
            title={option.title}
            onClick={() => onChange(option.key)}
          >
            <span className="visual-mode-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
