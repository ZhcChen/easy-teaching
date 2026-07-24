import { useEffect, useState } from "react";

export function usePersistentPanelCollapsed(storageKey: string) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsCollapsed(window.localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, isCollapsed ? "1" : "0");
  }, [isCollapsed, storageKey]);

  return [isCollapsed, setIsCollapsed] as const;
}
