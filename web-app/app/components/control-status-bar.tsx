import type { ReactNode } from "react";

type ControlStatusBarProps = {
  items: ReactNode[];
  status?: ReactNode;
  className?: string;
  itemsClassName?: string;
};

export function ControlStatusBar({
  items,
  status,
  className,
  itemsClassName,
}: ControlStatusBarProps) {
  const wrapperClassName = [
    "control-status-bar",
    status ? "has-status" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const itemsWrapperClassName = [
    "control-status-items",
    itemsClassName ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClassName}>
      <div className={itemsWrapperClassName}>
        {items.map((item, index) => (
          <span key={index} className="control-status-item">
            {item}
          </span>
        ))}
      </div>
      {status ? <div className="control-status-side">{status}</div> : null}
    </div>
  );
}
