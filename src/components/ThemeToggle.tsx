import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { applyTheme, getTheme, subscribeToThemeChange, type Theme } from "@/lib/theme";

export default function ThemeToggle({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const { t } = useI18n();

  useEffect(() => {
    const current = getTheme();
    setTheme(current);
    applyTheme(current);
    return subscribeToThemeChange(setTheme);
  }, []);

  const nextTheme: Theme = theme === "dark" ? "light" : "dark";
  const label = theme === "dark" ? t("nav.lightMode") : t("nav.darkMode");

  return (
    <button
      type="button"
      onClick={() => applyTheme(nextTheme)}
      aria-label={label}
      title={label}
      className={className}
    >
      {theme === "dark" ? (
        <Sun className="h-[18px] w-[18px] shrink-0" />
      ) : (
        <Moon className="h-[18px] w-[18px] shrink-0" />
      )}
      {!compact && <span className="font-medium tracking-tight">{label}</span>}
    </button>
  );
}
