type ControlStepItem = {
  key: string;
  label: string;
  stepLabel: string;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  onClick: () => void;
};

type ControlStepGroupProps = {
  items: ControlStepItem[];
  className?: string;
};

export function ControlStepGroup({
  items,
  className,
}: ControlStepGroupProps) {
  const groupClassName = ["control-step-group", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={groupClassName}>
      {items.map((item) => {
        const buttonClassName = [
          "control-step-button",
          item.active ? "is-active" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={item.key}
            type="button"
            className={buttonClassName}
            aria-pressed={item.active}
            aria-label={item.ariaLabel ?? item.label}
            title={item.title}
            disabled={item.disabled}
            onClick={item.onClick}
          >
            <span className="control-step-index">{item.stepLabel}</span>
            <span className="control-step-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
