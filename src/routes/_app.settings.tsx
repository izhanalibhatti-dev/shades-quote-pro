import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Cog, ShieldCheck, Database } from "lucide-react";
import { useQuote } from "@/components/QuoteContext";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings - Shades & Space" }] }),
  component: Settings,
});

function Settings() {
  const { quote, setQuote } = useQuote();
  const { t } = useI18n();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("settings.preferences")}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6 luxe-shadow">
        <CardHead icon={<Cog className="h-4 w-4" />} title={t("settings.quoteDefaults")} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label={t("settings.defaultLabour")}>
            <input
              type="number"
              min={0}
              step={5}
              value={quote.pricing.labourCost ?? 0}
              onChange={(e) =>
                setQuote((q) => ({
                  ...q,
                  pricing: {
                    ...q.pricing,
                    labourCost: Math.max(0, Number(e.target.value) || 0),
                  },
                }))
              }
              className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm tabular-nums focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </Field>
          <Field label={t("settings.vatRate")}>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={Math.round(quote.pricing.vatRate * 100)}
              onChange={(e) =>
                setQuote((q) => ({
                  ...q,
                  pricing: {
                    ...q.pricing,
                    vatRate: Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100,
                  },
                }))
              }
              className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm tabular-nums focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </Field>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border bg-card p-6"
      >
        <CardHead icon={<Database className="h-4 w-4" />} title={t("settings.dataStorage")} />
        <p className="mt-3 text-sm text-muted-foreground">{t("settings.dataStorageText")}</p>
        <ul className="mt-4 grid gap-2 text-sm">
          <Bullet>{t("settings.dataBullet1")}</Bullet>
          <Bullet>{t("settings.dataBullet2")}</Bullet>
          <Bullet>{t("settings.dataBullet3")}</Bullet>
        </ul>
      </motion.section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <CardHead icon={<ShieldCheck className="h-4 w-4" />} title={t("settings.access")} />
        <p className="mt-3 text-sm text-muted-foreground">{t("settings.accessText")}</p>
      </section>
    </div>
  );
}

function CardHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        {icon}
      </span>
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-muted-foreground">
      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
      <span>{children}</span>
    </li>
  );
}
