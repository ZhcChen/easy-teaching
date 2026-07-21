import type { ReactNode } from "react";

type StatusTone = "balanced" | "warning" | "active";

type StatusPillProps = {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
};

export function StatusPill({
  children,
  tone,
  className,
}: StatusPillProps) {
  const pillClassName = [
    tone ? `force-state-pill is-${tone}` : "force-quick-pill",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={pillClassName}>{children}</span>;
}
