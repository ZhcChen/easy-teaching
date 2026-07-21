import type { ReactNode } from "react";

import { ControlSectionHeader } from "./control-section-header";

type ControlPanelSectionProps = {
  title: string;
  hint?: string;
  accent?: boolean;
  className?: string;
  children: ReactNode;
};

export function ControlPanelSection({
  title,
  hint,
  accent = false,
  className,
  children,
}: ControlPanelSectionProps) {
  const sectionClassName = [
    "force-control-section",
    accent ? "force-control-section-accent" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={sectionClassName}>
      <ControlSectionHeader title={title} hint={hint} />
      {children}
    </section>
  );
}
