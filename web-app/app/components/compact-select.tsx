import { useEffect, useId, useMemo, useRef, useState } from "react";

type CompactSelectOption<T extends string> = {
  value: T;
  label: string;
  icon?: string;
  shortLabel?: string;
};

type CompactSelectProps<T extends string> = {
  value: T;
  options: CompactSelectOption<T>[];
  ariaLabel: string;
  className?: string;
  showTriggerLabel?: boolean;
  onChange: (nextValue: T) => void;
};

export function CompactSelect<T extends string>({
  value,
  options,
  ariaLabel,
  className,
  showTriggerLabel = true,
  onChange,
}: CompactSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0] ?? null,
    [options, value],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!selectedOption) {
    return null;
  }

  const rootClassName = [
    "compact-select",
    !showTriggerLabel ? "is-icon-only" : "",
    isOpen ? "is-open" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={rootRef} className={rootClassName}>
      <button
        type="button"
        className="compact-select-trigger"
        aria-label={`${ariaLabel}: ${selectedOption.label}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="compact-select-trigger-content">
          {selectedOption.icon ? (
            <span className="compact-select-flag" aria-hidden="true">
              {selectedOption.icon}
            </span>
          ) : null}
          {showTriggerLabel ? (
            <span className="compact-select-trigger-label">
              {selectedOption.shortLabel ?? selectedOption.label}
            </span>
          ) : null}
        </span>
      </button>

      {isOpen ? (
        <div id={listboxId} className="compact-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={
                option.value === value
                  ? "compact-select-option is-active"
                  : "compact-select-option"
              }
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.icon ? (
                <span className="compact-select-flag" aria-hidden="true">
                  {option.icon}
                </span>
              ) : null}
              <span className="compact-select-option-label">{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
