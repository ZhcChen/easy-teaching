import { useLocale, type AppLocale } from "../i18n";

const OPTIONS: Array<{
  value: AppLocale;
  label: string;
  ariaLabel: string;
}> = [
  { value: "zh-CN", label: "中", ariaLabel: "切换到中文" },
  { value: "en", label: "EN", ariaLabel: "Switch to English" },
];

export function LanguageToggle() {
  const { locale, setLocale, tt } = useLocale();

  return (
    <div className="theme-switch is-locale" role="group" aria-label={tt("语言切换")}>
      <span
        aria-hidden="true"
        className={locale === "en" ? "theme-switch-indicator is-dark" : "theme-switch-indicator"}
      />
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={locale === option.value ? "theme-switch-option is-active" : "theme-switch-option"}
          aria-pressed={locale === option.value}
          aria-label={option.ariaLabel}
          onClick={() => setLocale(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
