import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
export type Accent = "violet" | "blue" | "emerald" | "amber" | "rose";

interface ThemeContextValue {
  theme: Theme;
  accent: Accent;
  toggleTheme: () => void;
  setAccent: (accent: Accent) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("nobar-theme");
  return stored === "dark" ? "dark" : "light";
}

function readInitialAccent(): Accent {
  if (typeof window === "undefined") return "violet";
  const stored = window.localStorage.getItem("nobar-accent") as Accent | null;
  return stored ?? "violet";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [accent, setAccentState] = useState<Accent>(readInitialAccent);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("nobar-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
    window.localStorage.setItem("nobar-accent", accent);
  }, [accent]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      accent,
      toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
      setAccent: setAccentState,
    }),
    [theme, accent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
