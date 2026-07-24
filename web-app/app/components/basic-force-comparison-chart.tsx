export type BasicForceComparisonBarTone =
  | "current"
  | "recorded"
  | "pending"
  | "extended";

export type BasicForceComparisonBar = {
  key: string;
  label: string;
  meta: string;
  statusLabel: string;
  valueLabel: string;
  ratio: number;
  tone: BasicForceComparisonBarTone;
};

type BasicForceComparisonChartProps = {
  title: string;
  summary: string;
  bars: BasicForceComparisonBar[];
};

export function BasicForceComparisonChart({
  title,
  summary,
  bars,
}: BasicForceComparisonChartProps) {
  return (
    <div className="force-teaching-chart">
      <header className="force-teaching-chart-head">
        <strong>{title}</strong>
        <p>{summary}</p>
      </header>

      <div className="force-teaching-chart-body">
        {bars.map((bar) => {
          const rowClassName = [
            "force-teaching-chart-row",
            `is-${bar.tone}`,
          ].join(" ");
          const fillWidth = Math.max(0, Math.min(100, bar.ratio * 100));

          return (
            <article key={bar.key} className={rowClassName}>
              <div className="force-teaching-chart-row-head">
                <div className="force-teaching-chart-row-copy">
                  <strong className="force-teaching-row-label">{bar.label}</strong>
                  <span className="force-teaching-row-meta">{bar.meta}</span>
                </div>
                <div className="force-teaching-chart-row-side">
                  <span className="force-teaching-chart-status">{bar.statusLabel}</span>
                  <strong className="force-teaching-row-value">{bar.valueLabel}</strong>
                </div>
              </div>

              <div className="force-teaching-bar-track">
                <span
                  className="force-teaching-bar-fill"
                  style={{ width: `${fillWidth}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
