import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Blinds, BriefcaseBusiness, DoorOpen } from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";

const TABS = [
  { to: "/project", labelKey: "tabs.project", icon: BriefcaseBusiness },
  { to: "/quote", labelKey: "tabs.blinds", icon: Blinds },
  { to: "/wardrobe", labelKey: "tabs.wardrobes", icon: DoorOpen },
] as const;

export default function QuoteTypeTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();
  return (
    <div className="mb-6 inline-flex items-center gap-1 rounded-2xl border border-border bg-card p-1 luxe-shadow">
      {TABS.map((tab) => {
        const active = pathname === tab.to;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {active && (
              <motion.span
                layoutId="quote-tab-pill"
                className="absolute inset-0 -z-10 rounded-xl bg-accent"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <Icon className="h-4 w-4" />
            {t(tab.labelKey as TranslationKey)}
          </Link>
        );
      })}
    </div>
  );
}
