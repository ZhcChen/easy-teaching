import { useEffect, useRef, useState, type CSSProperties } from "react";

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
  editable?: boolean;
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
  editable = false,
  valueFormatter,
  onChange,
}: ControlRangeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(() => formatEditableValue(value, step));
  const inputRef = useRef<HTMLInputElement | null>(null);
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
  const rangeProgress =
    max <= min ? 0 : ((value - min) / (max - min)) * 100;
  const rangeStyle = {
    "--range-progress": `${Math.min(100, Math.max(0, rangeProgress))}%`,
  } as CSSProperties;

  useEffect(() => {
    if (isEditing) {
      return;
    }

    setDraftValue(formatEditableValue(value, step));
  }, [isEditing, step, value]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isEditing]);

  function commitDraftValue() {
    const parsedValue = Number(draftValue.trim());
    if (Number.isNaN(parsedValue)) {
      setDraftValue(formatEditableValue(value, step));
      setIsEditing(false);
      return;
    }

    const nextValue = clampAndSnapRangeValue(parsedValue, min, max, step);
    onChange(nextValue);
    setDraftValue(formatEditableValue(nextValue, step));
    setIsEditing(false);
  }

  function cancelDraftValue() {
    setDraftValue(formatEditableValue(value, step));
    setIsEditing(false);
  }

  return (
    <div className={wrapperClassName}>
      <div className="force-control-label-row">
        <label htmlFor={id} className="force-control-label">
          {label}
        </label>
        {editable && !disabled ? (
          isEditing ? (
            <input
              ref={inputRef}
              aria-label={`${label} 数值输入`}
              className="force-control-value-input"
              inputMode="decimal"
              type="text"
              value={draftValue}
              onBlur={commitDraftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitDraftValue();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelDraftValue();
                }
              }}
            />
          ) : (
            <button
              className="force-control-value-button"
              type="button"
              onClick={() => setIsEditing(true)}
            >
              {displayValue}
            </button>
          )
        ) : (
          <span className="force-control-value">{displayValue}</span>
        )}
      </div>
      <input
        id={id}
        className="force-range-input"
        style={rangeStyle}
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
  const digits = getStepDigits(step);
  const fixed = value.toFixed(digits).replace(/\.0+$|(\.\d*[1-9])0+$/, "$1");
  return unit ? `${fixed} ${unit}` : fixed;
}

function formatEditableValue(value: number, step: number) {
  const digits = getStepDigits(step);
  return value.toFixed(digits).replace(/\.0+$|(\.\d*[1-9])0+$/, "$1");
}

function clampAndSnapRangeValue(value: number, min: number, max: number, step: number) {
  const boundedValue = Math.min(max, Math.max(min, value));
  if (step <= 0) {
    return boundedValue;
  }

  const digits = getStepDigits(step);
  const normalizedValue = Math.round((boundedValue - min) / step) * step + min;
  const snappedValue = Number(normalizedValue.toFixed(digits));
  return Math.min(max, Math.max(min, snappedValue));
}

function getStepDigits(step: number) {
  const digits = step < 0.1 ? 2 : 1;
  return digits;
}
