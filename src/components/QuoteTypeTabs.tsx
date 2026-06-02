import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Blinds, DoorOpen } from "lucide-react";

const TABS = [
  { to: "/quote", label: "Blinds Quote", icon: Blinds },
  { to: "/wardrobe", label: "Wardrobes & Doors", icon: DoorOpen },
] as const;

export default function QuoteTypeTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mb-6 inline-flex items-center gap-1 rounded-2xl border border-border bg-card p-1 luxe-shadow">
      {TABS.map((t) => {
        const active = pathname === t.to;
        const Icon = t.icon;
        return (
          <Link
            key={t.to}
            to={t.to}
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
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
