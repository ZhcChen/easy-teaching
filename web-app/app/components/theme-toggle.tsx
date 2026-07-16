import { useEffect, useState } from "react";

const STORAGE_KEY = "easy-teaching-theme";

type ThemeMode = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const current = readTheme();
    applyTheme(current);
    setTheme(current);
  }, []);

  function setMode(nextTheme: ThemeMode) {
    applyTheme(nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  return (
    <div className="theme-switch" role="group" aria-label="主题切换">
      <span
        aria-hidden="true"
        className={theme === "dark" ? "theme-switch-indicator is-dark" : "theme-switch-indicator"}
      />
      <button
        type="button"
        className={theme === "light" ? "theme-switch-option is-active" : "theme-switch-option"}
        onClick={() => setMode("light")}
        aria-pressed={theme === "light"}
      >
        亮色
      </button>
      <button
        type="button"
        className={theme === "dark" ? "theme-switch-option is-active" : "theme-switch-option"}
        onClick={() => setMode("dark")}
        aria-pressed={theme === "dark"}
      >
        暗色
      </button>
    </div>
  );
}

function readTheme(): ThemeMode {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
}
