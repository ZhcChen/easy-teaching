import type { StudyFactor } from "./basic-force-lab-state";

export type BasicForceRecordRow = {
  key: string;
  label: string;
  value: string;
  note: string;
  isCurrent?: boolean;
};

export type BasicForceRecordGroup = {
  key: StudyFactor;
  title: string;
  countLabel: string;
  isActive?: boolean;
  rows: BasicForceRecordRow[];
  conclusion?: string;
};

type BasicForceRecordTableProps = {
  groups: BasicForceRecordGroup[];
  emptyTitle: string;
  emptyCopy: string;
  pendingCopy?: string;
};

export function BasicForceRecordTable({
  groups,
  emptyTitle,
  emptyCopy,
  pendingCopy = "Waiting for record",
}: BasicForceRecordTableProps) {
  const hasAnyRows = groups.some((group) => group.rows.length > 0);

  return (
    <div className="force-record-table-shell">
      {!hasAnyRows ? (
        <div className="force-record-table-empty">
          <strong>{emptyTitle}</strong>
          <p>{emptyCopy}</p>
        </div>
      ) : null}

      <div className="force-record-table">
        {groups.map((group) => {
          const groupClassName = [
            "force-record-group",
            group.isActive ? "is-active" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <section key={group.key} className={groupClassName}>
              <header className="force-record-group-head">
                <h4>{group.title}</h4>
                <span>{group.countLabel}</span>
              </header>

              {group.rows.length === 0 ? (
                <p className="force-record-group-empty">{pendingCopy}</p>
              ) : (
                <div className="force-record-group-body">
                  {group.rows.map((row) => (
                    <article
                      key={row.key}
                      className={row.isCurrent ? "force-record-row is-current" : "force-record-row"}
                    >
                      <div className="force-record-row-main">
                        <strong>{row.label}</strong>
                        <span>{row.note}</span>
                      </div>
                      <div className="force-record-row-value">{row.value}</div>
                    </article>
                  ))}
                </div>
              )}

              {group.conclusion ? (
                <p className="force-record-group-conclusion">{group.conclusion}</p>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
