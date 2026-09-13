"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

/**
 * Kept in sync with the inline script in `app/layout.tsx`, which applies the stored theme before
 * first paint. The DOM attribute is the source of truth so the two can never disagree.
 */
const listeners = new Set<() => void>();

function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function setTheme(theme: Theme) {
  if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode / storage disabled: the theme still applies for this session.
  }
  listeners.forEach((l) => l());
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  // Light on the server: it's the default, so markup matches the pre-paint script's no-op case.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const toggle = useCallback(() => setTheme(readTheme() === "dark" ? "light" : "dark"), []);
  return { theme, toggle };
}
