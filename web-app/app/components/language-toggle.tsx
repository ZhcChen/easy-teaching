import { CompactSelect } from "./compact-select";
import { useLocale, type AppLocale } from "../i18n";

const OPTIONS: Array<{
  value: AppLocale;
  label: string;
}> = [
  { value: "zh-CN", label: "中文" },
  { value: "en", label: "English" },
];

export function LanguageToggle() {
  const { locale, setLocale, tt } = useLocale();

  return (
    <CompactSelect
      className="topbar-language-select"
      value={locale}
      options={OPTIONS}
      ariaLabel={tt("语言切换")}
      onChange={setLocale}
    />
  );
}
