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
  compact?: boolean;
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
  compact = false,
}: BasicForceClassroomSummaryProps) {
  return (
    <section className={compact ? "force-classroom-summary is-compact" : "force-classroom-summary"}>
      <div className="force-classroom-summary-head">
        <span className="force-classroom-summary-kicker">{heading}</span>
        <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
      </div>

      <strong className="force-classroom-summary-title">{title}</strong>
      {!compact ? <p className="force-classroom-summary-copy">{copy}</p> : null}

      {!compact ? (
        <div className="force-classroom-summary-progress" aria-hidden="true">
          <span style={{ width: `${Math.max(0, Math.min(progress, 1)) * 100}%` }} />
        </div>
      ) : null}

      <div className="force-classroom-summary-meta">
        {meta.map((item) => (
          <span key={item} className="force-classroom-summary-meta-item">
            {item}
          </span>
        ))}
      </div>

      {!compact && note ? <p className="force-classroom-summary-note">{note}</p> : null}
    </section>
  );
}
