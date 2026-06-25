const KEY = "sas.theme";
const THEME_CHANGE_EVENT = "sas-theme-change";

export type Theme = "light" | "dark";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = (() => {
    try {
      return localStorage.getItem(KEY) as Theme | null;
    } catch {
      return null;
    }
  })();
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(KEY, theme);
  } catch (_error) {
    // Local storage can be unavailable in private or restricted browser contexts.
  }
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

export function subscribeToThemeChange(callback: (theme: Theme) => void) {
  const onThemeChange = (event: Event) => {
    const theme = (event as CustomEvent<Theme>).detail;
    if (theme === "light" || theme === "dark") callback(theme);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) callback(getTheme());
  };
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.removeEventListener("storage", onStorage);
  };
}
