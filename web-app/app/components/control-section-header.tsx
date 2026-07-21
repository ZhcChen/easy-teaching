type ControlSectionHeaderProps = {
  title: string;
  hint?: string;
};

export function ControlSectionHeader({
  title,
  hint,
}: ControlSectionHeaderProps) {
  return (
    <div className="force-control-section-head">
      <h5 className="force-control-section-title">{title}</h5>
      {hint ? <span className="force-section-hint">{hint}</span> : null}
    </div>
  );
}
