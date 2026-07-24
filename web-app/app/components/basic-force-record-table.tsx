import type { StudyFactor } from "./basic-force-lab-state";

export type BasicForceRecordRow = {
  key: string;
  label: string;
  value: string;
  note: string;
  isCurrent?: boolean;
  isPending?: boolean;
};

export type BasicForceRecordGroup = {
  key: StudyFactor;
  title: string;
  countLabel: string;
  isActive?: boolean;
  rows: BasicForceRecordRow[];
  helper?: string;
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
  const hasAnyRecordedRows = groups.some((group) =>
    group.rows.some((row) => !row.isPending),
  );

  return (
    <div className="force-record-table-shell">
      {!hasAnyRecordedRows ? (
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

              {group.helper ? (
                <p className="force-record-group-helper">{group.helper}</p>
              ) : null}

              {group.rows.length === 0 ? (
                <p className="force-record-group-empty">{pendingCopy}</p>
              ) : (
                <div className="force-record-group-body">
                  {group.rows.map((row) => (
                    <article
                      key={row.key}
                      className={[
                        "force-record-row",
                        row.isCurrent ? "is-current" : "",
                        row.isPending ? "is-pending" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="force-record-row-main">
                        <strong>{row.label}</strong>
                        <span>{row.note}</span>
                      </div>
                      <div
                        className={
                          row.isPending
                            ? "force-record-row-value is-pending"
                            : "force-record-row-value"
                        }
                      >
                        {row.isPending ? pendingCopy : row.value}
                      </div>
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
