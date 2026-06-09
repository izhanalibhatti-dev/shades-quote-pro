import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Ruler, Lightbulb, FileDown, Plus } from "lucide-react";
import { useQuote } from "@/components/QuoteContext";
import { BLIND_PRODUCT_TYPES } from "@/data/blinds/productTypes";
import { fabrics } from "@/data/catalog";
import { getIntlLocale, useI18n } from "@/lib/i18n";
import { formatGBP } from "@/lib/quote-types";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - Shades & Space" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { setQuote, recent } = useQuote();
  const { locale, t } = useI18n();
  const dateLocale = getIntlLocale(locale);
  const quickStarts = BLIND_PRODUCT_TYPES.map((blindType) => {
    const fabric = fabrics.find((item) => {
      const matches = item.compatibleBlindTypes?.includes(blindType.id) ?? false;
      return matches && !item.isFallback;
    });
    return fabric ? { blindType, fabric } : null;
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card luxe-shadow">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden
          style={{
            background:
              "radial-gradient(60% 80% at 90% 0%, color-mix(in oklab, var(--color-accent) 35%, transparent), transparent 70%), radial-gradient(50% 60% at 0% 100%, color-mix(in oklab, var(--color-primary) 12%, transparent), transparent 60%)",
          }}
        />
        <div className="relative grid gap-6 p-7 md:grid-cols-[1.4fr_1fr] md:p-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
              <Sparkles className="h-3 w-3" /> {t("dashboard.badge")}
            </div>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              {t("dashboard.title")}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
              {t("dashboard.subtitle")}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/quote"
                className="group inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-all hover:opacity-95"
              >
                <Plus className="h-4 w-4" /> {t("dashboard.createQuote")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/settings"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background/60 px-4 text-sm font-medium text-foreground hover:bg-accent"
              >
                {t("dashboard.adjustDefaults")}
              </Link>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {t("dashboard.today")}
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {new Date().toLocaleDateString(dateLocale, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t("dashboard.workspace")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick product shortcuts */}
      <section>
        <SectionHeader
          title={t("dashboard.quickStart")}
          caption={t("dashboard.quickStartCaption")}
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {quickStarts.map(({ blindType, fabric }, i) => (
            <motion.div
              key={`${blindType.id}-${fabric.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.03 }}
            >
              <Link
                to="/quote"
                onClick={() =>
                  setQuote((q) => ({
                    ...q,
                    product: {
                      ...q.product,
                      supplierId: fabric.supplierId,
                      productTypeId: fabric.productTypeId,
                      fabricId: fabric.id,
                    },
                  }))
                }
                className="group relative flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <BlindGlyph />
                  <div className="text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                    {t("dashboard.startQuote")}
                  </div>
                </div>
                <div className="mt-6">
                  <div className="text-sm font-semibold tracking-tight">{blindType.label}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                    {t("dashboard.startQuote")}{" "}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Recent exports */}
        <div className="rounded-3xl border border-border bg-card p-6">
          <SectionHeader
            title={t("dashboard.recentExports")}
            caption={t("dashboard.recentCaption")}
            inline
          />
          {recent.length === 0 ? (
            <div className="mt-5 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
              <FileDown className="h-5 w-5 text-muted-foreground" />
              <div className="text-sm font-medium">{t("dashboard.noExports")}</div>
              <p className="max-w-sm text-xs text-muted-foreground">{t("dashboard.exportHelp")}</p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {recent.map((r) => (
                <li key={r.ref + r.at} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {r.name || t("dashboard.unnamedCustomer")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.ref} ·{" "}
                      {new Date(r.at).toLocaleTimeString(dateLocale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tracking-tight">{formatGBP(r.total)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tips */}
        <div className="space-y-6">
          <InfoCard
            icon={<Ruler className="h-4 w-4" />}
            title={t("dashboard.measurementTips")}
            items={[
              t("dashboard.tipMeasure1"),
              t("dashboard.tipMeasure2"),
              t("dashboard.tipMeasure3"),
              t("dashboard.tipMeasure4"),
            ]}
          />
          <InfoCard
            icon={<Lightbulb className="h-4 w-4" />}
            title={t("dashboard.quickGuide")}
            items={[
              t("dashboard.guide1"),
              t("dashboard.guide2"),
              t("dashboard.guide3"),
              t("dashboard.guide4"),
            ]}
          />
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  caption,
  inline,
}: {
  title: string;
  caption?: string;
  inline?: boolean;
}) {
  return (
    <div className={inline ? "flex items-end justify-between" : ""}>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {caption && (
        <p className={`text-xs text-muted-foreground ${inline ? "" : "mt-1"}`}>{caption}</p>
      )}
    </div>
  );
}

function InfoCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          {icon}
        </span>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((s) => (
          <li key={s} className="flex gap-2.5 text-sm text-muted-foreground">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
            <span className="leading-snug">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BlindGlyph() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="text-foreground/70"
      >
        <path d="M5 4h14M5 4v16M19 4v16M5 20h14" />
        <path d="M5 8h14M5 12h14M5 16h14" />
      </svg>
    </span>
  );
}
