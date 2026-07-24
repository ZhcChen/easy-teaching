import { StatusPill } from "./status-pill";

type SummaryTone = "balanced" | "warning" | "active";

type BasicForceClassroomSummaryProps = {
  heading: string;
  title: string;
  copy: string;
  statusLabel: string;
  statusTone: SummaryTone;
  progress: number;
  meta: string[];
  note?: string;
};

export function BasicForceClassroomSummary({
  heading,
  title,
  copy,
  statusLabel,
  statusTone,
  progress,
  meta,
  note,
}: BasicForceClassroomSummaryProps) {
  return (
    <section className="force-classroom-summary">
      <div className="force-classroom-summary-head">
        <span className="force-classroom-summary-kicker">{heading}</span>
        <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
      </div>

      <strong className="force-classroom-summary-title">{title}</strong>
      <p className="force-classroom-summary-copy">{copy}</p>

      <div className="force-classroom-summary-progress" aria-hidden="true">
        <span style={{ width: `${Math.max(0, Math.min(progress, 1)) * 100}%` }} />
      </div>

      <div className="force-classroom-summary-meta">
        {meta.map((item) => (
          <span key={item} className="force-classroom-summary-meta-item">
            {item}
          </span>
        ))}
      </div>

      {note ? <p className="force-classroom-summary-note">{note}</p> : null}
    </section>
  );
}
