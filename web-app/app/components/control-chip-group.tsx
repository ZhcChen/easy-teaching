type ControlChipItem = {
  key: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  onClick: () => void;
};

type ControlChipGroupProps = {
  items: ControlChipItem[];
  columns?: 1 | 2 | 3;
  compact?: boolean;
  className?: string;
};

export function ControlChipGroup({
  items,
  columns = 3,
  compact = false,
  className,
}: ControlChipGroupProps) {
  const groupClassName = [
    "control-chip-group",
    `is-${columns}-column`,
    compact ? "is-compact" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={groupClassName}>
      {items.map((item) => {
        const buttonClassName = [
          "control-chip-button",
          compact ? "is-compact" : "",
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
            <span className="control-chip-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
