import { Languages } from "lucide-react";
import { LOCALES, useI18n, type LocaleCode } from "@/lib/i18n";

export default function LanguageSelector({
  compact = false,
  showLabel = true,
}: {
  compact?: boolean;
  showLabel?: boolean;
}) {
  const { locale, setLocale, t } = useI18n();
  const selectedLocale = LOCALES.find((item) => item.code === locale) ?? LOCALES[0];

  if (compact) {
    return (
      <label
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background/70 text-sm"
        title={`${t("language.label")}: ${selectedLocale.label}`}
      >
        <span aria-hidden className="text-base leading-none">
          {selectedLocale.flag}
        </span>
        <select
          value={locale}
          aria-label={t("language.label")}
          onChange={(event) => setLocale(event.target.value as LocaleCode)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {LOCALES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.flag} {item.nativeLabel}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label
      className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2 text-sm"
      title={t("language.label")}
    >
      <Languages className="h-4 w-4 shrink-0 text-muted-foreground" />
      {showLabel && (
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t("language.label")}
        </span>
      )}
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as LocaleCode)}
        className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
      >
        {LOCALES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.flag} {item.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
