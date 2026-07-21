import type { ReactNode } from "react";

type ControlOptionItem = {
  key: string;
  label: string;
  description: string;
  active?: boolean;
  disabled?: boolean;
  preview?: ReactNode;
  onClick: () => void;
};

type ControlOptionGroupProps = {
  items: ControlOptionItem[];
  columns?: 1 | 2 | 3;
  className?: string;
};

export function ControlOptionGroup({
  items,
  columns = 2,
  className,
}: ControlOptionGroupProps) {
  const groupClassName = [
    "control-option-grid",
    `is-${columns}-column`,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={groupClassName}>
      {items.map((item) => {
        const buttonClassName = [
          "control-option-card",
          item.active ? "is-active" : "",
          item.preview ? "has-preview" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={item.key}
            type="button"
            className={buttonClassName}
            aria-pressed={item.active}
            disabled={item.disabled}
            onClick={item.onClick}
          >
            {item.preview ? (
              <span className="control-option-preview-slot" aria-hidden="true">
                {item.preview}
              </span>
            ) : null}
            <strong className="control-option-title">{item.label}</strong>
            <span className="control-option-copy">{item.description}</span>
          </button>
        );
      })}
    </div>
  );
}
