type ControlRangeProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  disabled?: boolean;
  className?: string;
  valueFormatter?: (value: number) => string;
  onChange: (value: number) => void;
};

export function ControlRange({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  disabled = false,
  className,
  valueFormatter,
  onChange,
}: ControlRangeProps) {
  const wrapperClassName = [
    "force-control-stack",
    disabled ? "is-disabled" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const displayValue = valueFormatter
    ? valueFormatter(value)
    : formatRangeValue(value, step, unit);

  return (
    <div className={wrapperClassName}>
      <div className="force-control-label-row">
        <label htmlFor={id} className="force-control-label">
          {label}
        </label>
        <span className="force-control-value">{displayValue}</span>
      </div>
      <input
        id={id}
        className="force-range-input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function formatRangeValue(value: number, step: number, unit?: string) {
  const digits = step < 0.1 ? 2 : 1;
  const fixed = value.toFixed(digits).replace(/\.0+$|(\.\d*[1-9])0+$/, "$1");
  return unit ? `${fixed} ${unit}` : fixed;
}
