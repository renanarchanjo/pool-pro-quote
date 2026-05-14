import { useEffect, useRef, useState } from "react";

/**
 * Drop-in replacement for useState that mirrors the value into sessionStorage,
 * so it survives reloads (and tab restores) but is scoped to the browser tab.
 *
 * Usage:
 *   const [tab, setTab] = usePersistedState("admin:brands:tab", "brands");
 */
export function usePersistedState<T>(key: string, initial: T) {
  const storageKey = `persist::${key}`;

  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  const keyRef = useRef(storageKey);
  keyRef.current = storageKey;

  useEffect(() => {
    try {
      window.sessionStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      /* ignore quota / serialization issues */
    }
  }, [value]);

  return [value, setValue] as const;
}
