import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import AppSidebar from "@/components/AppSidebar";
import { QuoteProvider } from "@/components/QuoteContext";
import AccessibilityWidget from "@/components/AccessibilityWidget";
import { isAuthed } from "@/lib/auth";
import { applyTheme, getTheme } from "@/lib/theme";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthed()) {
      throw redirect({ to: "/" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    applyTheme(getTheme());
  }, []);

  return (
    <QuoteProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/70 bg-background/70 px-4 backdrop-blur-md md:px-8">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Shades &amp; Space / Quote Studio
            </div>
          </header>

          <main className="relative flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="px-4 py-6 md:px-10 md:py-10"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <Toaster richColors position="top-right" />
        <AccessibilityWidget />
      </div>
    </QuoteProvider>
  );
}
