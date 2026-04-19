import { MoonStar, SunMedium } from "lucide-react";

export function ThemeToggle({ theme, onToggle }) {
  return (
    <button type="button" className="btn-secondary" onClick={onToggle}>
      {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      {theme === "dark" ? "Light" : "Dark"} mode
    </button>
  );
}
