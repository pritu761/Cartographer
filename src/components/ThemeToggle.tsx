"use client";

import { useEffect, useState } from "react";
import { Laptop, Moon, Sun } from "lucide-react";

export type ThemePreference = "system" | "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>("system");

  useEffect(() => {
    const saved = (localStorage.getItem("cartograph_theme") as ThemePreference) || "system";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function applyTheme(newTheme: ThemePreference) {
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
    } else if (newTheme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }

  function handleSelect(newTheme: ThemePreference) {
    setTheme(newTheme);
    localStorage.setItem("cartograph_theme", newTheme);
    applyTheme(newTheme);
  }

  return (
    <div className="flex items-center rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] p-0.5 text-xs">
      <button
        type="button"
        title="Follow system theme"
        onClick={() => handleSelect("system")}
        className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
          theme === "system"
            ? "bg-[var(--bg-panel)] font-medium text-[var(--accent-blue)] shadow-xs"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        }`}
      >
        <Laptop size={13} />
        <span className="hidden sm:inline">System</span>
      </button>

      <button
        type="button"
        title="Light theme"
        onClick={() => handleSelect("light")}
        className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
          theme === "light"
            ? "bg-[var(--bg-panel)] font-medium text-[var(--accent-blue)] shadow-xs"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        }`}
      >
        <Sun size={13} />
        <span className="hidden sm:inline">Light</span>
      </button>

      <button
        type="button"
        title="Dark theme"
        onClick={() => handleSelect("dark")}
        className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
          theme === "dark"
            ? "bg-[var(--bg-panel)] font-medium text-[var(--accent-blue)] shadow-xs"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        }`}
      >
        <Moon size={13} />
        <span className="hidden sm:inline">Dark</span>
      </button>
    </div>
  );
}
