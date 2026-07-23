import { CompactSelect } from "./compact-select";
import { useLocale, type AppLocale } from "../i18n";

const OPTIONS: Array<{
  value: AppLocale;
  label: string;
  icon: string;
}> = [
  { value: "zh-CN", label: "中文", icon: "🇨🇳" },
  { value: "en", label: "English", icon: "🇺🇸" },
];

export function LanguageToggle() {
  const { locale, setLocale, tt } = useLocale();

  return (
    <CompactSelect
      className="topbar-language-select"
      value={locale}
      options={OPTIONS}
      ariaLabel={tt("语言切换")}
      showTriggerLabel={false}
      onChange={setLocale}
    />
  );
}
