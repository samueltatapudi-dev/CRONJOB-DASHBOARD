import { useEffect, useState } from "react";

const THEME_KEY = "cron-dashboard-theme";

function getPreferredTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState(() => getPreferredTheme());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return {
    theme,
    toggleTheme() {
      setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
    },
  };
}
