import type { ReactNode } from "react";

type StatusPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  tone?: "default" | "danger";
  actions?: ReactNode;
  children?: ReactNode;
};

export function StatusPanel({
  eyebrow,
  title,
  description,
  tone = "default",
  actions,
  children,
}: StatusPanelProps) {
  return (
    <section className={tone === "danger" ? "status-panel is-danger" : "status-panel"}>
      <p className="status-kicker">{eyebrow}</p>
      <h1 className="status-title">{title}</h1>
      <p className="status-copy">{description}</p>
      {actions ? <div className="status-actions">{actions}</div> : null}
      {children}
    </section>
  );
}
