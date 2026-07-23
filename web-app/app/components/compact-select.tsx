import type { ChangeEvent } from "react";

type CompactSelectOption<T extends string> = {
  value: T;
  label: string;
};

type CompactSelectProps<T extends string> = {
  value: T;
  options: CompactSelectOption<T>[];
  ariaLabel: string;
  className?: string;
  onChange: (nextValue: T) => void;
};

export function CompactSelect<T extends string>({
  value,
  options,
  ariaLabel,
  className,
  onChange,
}: CompactSelectProps<T>) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value as T);
  }

  const rootClassName = ["compact-select", className ?? ""].filter(Boolean).join(" ");

  return (
    <label className={rootClassName}>
      <select
        className="compact-select-control"
        value={value}
        aria-label={ariaLabel}
        onChange={handleChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="compact-select-chevron" aria-hidden="true">
        <svg viewBox="0 0 12 12" focusable="false">
          <path
            d="M2.2 4.2 6 8l3.8-3.8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </span>
    </label>
  );
}
