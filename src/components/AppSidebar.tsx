import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FilePlus2,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  DoorOpen,
  BriefcaseBusiness,
} from "lucide-react";
import Logo from "@/components/Logo";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeToggle from "@/components/ThemeToggle";
import { signOut } from "@/lib/auth";
import { useI18n, type TranslationKey } from "@/lib/i18n";

const NAV = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/project", labelKey: "nav.project", icon: BriefcaseBusiness },
  { to: "/quote", labelKey: "nav.blinds", icon: FilePlus2 },
  { to: "/wardrobe", labelKey: "nav.wardrobes", icon: DoorOpen },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
] as const;

export default function AppSidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/" });
  };

  const width = collapsed ? "w-[76px]" : "w-[244px]";

  const Inner = (
    <div className="flex h-full w-full flex-col">
      {!collapsed && (
        <div className="flex min-h-[112px] items-center px-5 pt-6 pb-5">
          <div className="flex h-[58px] w-full items-center overflow-hidden">
            <Logo className="h-full w-full object-contain object-left" />
          </div>
        </div>
      )}

      <nav className={`${collapsed ? "mt-8" : "mt-2"} flex flex-col gap-1 px-3`}>
        {NAV.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-sidebar-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && (
                <span className="truncate font-medium tracking-tight">
                  {t(item.labelKey as TranslationKey)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 px-3 pb-5">
        <div className={collapsed ? "flex justify-center" : "w-full"}>
          <LanguageSelector compact={collapsed} showLabel={false} />
        </div>
        <ThemeToggle
          compact={collapsed}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground ${collapsed ? "justify-center px-2" : ""}`}
        />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden md:flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground ${collapsed ? "justify-center px-2" : ""}`}
        >
          {collapsed ? (
            <PanelLeft className="h-[18px] w-[18px]" />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px]" />
          )}
          {!collapsed && <span className="font-medium tracking-tight">{t("nav.collapse")}</span>}
        </button>
        <button
          onClick={handleSignOut}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground ${collapsed ? "justify-center px-2" : ""}`}
        >
          <LogOut className="h-[18px] w-[18px]" />
          {!collapsed && <span className="font-medium tracking-tight">{t("nav.signOut")}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={`hidden md:flex shrink-0 ${width} sticky top-0 h-screen overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-out`}
      >
        {Inner}
      </aside>

      {/* Mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] bg-sidebar border-r border-sidebar-border md:hidden"
            >
              {Inner}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
