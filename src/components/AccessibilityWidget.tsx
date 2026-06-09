import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Accessibility,
  Volume2,
  Pause,
  Plus,
  Minus,
  RotateCcw,
  Contrast,
  EyeOff,
  X,
  Eye,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * Self-contained accessibility widget.
 * - Read page text aloud (Web Speech API) + pause/stop
 * - Increase / decrease / reset text size (applies CSS font-size scale on <html>)
 * - Toggle high contrast mode (adds `.a11y-high-contrast` to <html>)
 * - Hide / show the floating button entirely
 *
 * All state persisted in localStorage under `sas.a11y.*`.
 * Lives in its own file so it's easy to find and edit later.
 */

const LS = {
  scale: "sas.a11y.scale",
  contrast: "sas.a11y.contrast",
  hidden: "sas.a11y.hidden",
};

const MIN = 0.85;
const MAX = 1.4;
const STEP = 0.1;

function applyScale(scale: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("font-size", `${Math.round(scale * 100)}%`);
}
function applyContrast(on: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("a11y-high-contrast", on);
}

function readNumber(key: string, fallback: number) {
  try {
    const v = parseFloat(localStorage.getItem(key) ?? "");
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function readBool(key: string, fallback = false) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

export default function AccessibilityWidget() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scale, setScale] = useState(1);
  const [contrast, setContrast] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Boot
  useEffect(() => {
    const s = readNumber(LS.scale, 1);
    const c = readBool(LS.contrast);
    const h = readBool(LS.hidden);
    setScale(s);
    setContrast(c);
    setHidden(h);
    applyScale(s);
    applyContrast(c);
  }, []);

  // Reveal hidden widget with Alt+A
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        setHidden(false);
        try {
          localStorage.setItem(LS.hidden, "0");
        } catch {
          /* ignore */
        }
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const persist = (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  };

  const changeScale = (next: number) => {
    const clamped = Math.min(MAX, Math.max(MIN, Math.round(next * 100) / 100));
    setScale(clamped);
    applyScale(clamped);
    persist(LS.scale, String(clamped));
  };

  const toggleContrast = () => {
    const next = !contrast;
    setContrast(next);
    applyContrast(next);
    persist(LS.contrast, next ? "1" : "0");
  };

  const stopSpeech = () => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    setSpeaking(false);
  };

  const readAloud = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    stopSpeech();
    const main =
      document.querySelector("main") ?? document.querySelector("[role=main]") ?? document.body;
    const text = (main?.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 6000);
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const hideWidget = () => {
    stopSpeech();
    setOpen(false);
    setHidden(true);
    persist(LS.hidden, "1");
  };

  // Cleanup on unmount
  useEffect(() => () => stopSpeech(), []);

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => {
          setHidden(false);
          persist(LS.hidden, "0");
        }}
        aria-label={t("a11y.showTools")}
        className="fixed bottom-3 left-3 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground opacity-60 shadow-sm backdrop-blur transition hover:opacity-100"
        title={t("a11y.showTools")}
      >
        <Eye className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-label={t("a11y.tools")}
            className="mb-3 w-[280px] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                <Accessibility className="h-4 w-4" />
                {t("a11y.tools")}
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={t("a11y.closePanel")}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <Section title={t("a11y.readAloud")}>
                <div className="flex gap-2">
                  <ToolButton onClick={readAloud} aria-pressed={speaking}>
                    <Volume2 className="h-4 w-4" />
                    {speaking ? t("a11y.reading") : t("a11y.readPage")}
                  </ToolButton>
                  <ToolButton onClick={stopSpeech} variant="outline">
                    <Pause className="h-4 w-4" />
                    {t("a11y.stop")}
                  </ToolButton>
                </div>
              </Section>

              <Section
                title={t("a11y.textSize")}
                right={<span className="tabular-nums">{Math.round(scale * 100)}%</span>}
              >
                <div className="flex gap-2">
                  <ToolButton
                    onClick={() => changeScale(scale - STEP)}
                    disabled={scale <= MIN + 0.001}
                    aria-label={t("a11y.decreaseText")}
                  >
                    <Minus className="h-4 w-4" />
                  </ToolButton>
                  <ToolButton
                    onClick={() => changeScale(scale + STEP)}
                    disabled={scale >= MAX - 0.001}
                    aria-label={t("a11y.increaseText")}
                  >
                    <Plus className="h-4 w-4" />
                  </ToolButton>
                  <ToolButton
                    onClick={() => changeScale(1)}
                    variant="outline"
                    aria-label={t("a11y.resetText")}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t("actions.reset")}
                  </ToolButton>
                </div>
              </Section>

              <Section title={t("a11y.display")}>
                <ToolButton
                  onClick={toggleContrast}
                  variant={contrast ? "default" : "outline"}
                  aria-pressed={contrast}
                  className="w-full"
                >
                  <Contrast className="h-4 w-4" />
                  {contrast ? t("a11y.contrastOn") : t("a11y.contrastOff")}
                </ToolButton>
              </Section>

              <button
                onClick={hideWidget}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <EyeOff className="h-3.5 w-3.5" />
                {t("a11y.hideWidget")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        aria-label={t("a11y.tools")}
        aria-expanded={open}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl ring-1 ring-black/5 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Accessibility className="h-5 w-5" />
      </motion.button>
    </div>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <span>{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

function ToolButton({
  children,
  variant = "default",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" }) {
  const base =
    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "outline"
      ? "border border-border bg-background text-foreground hover:bg-accent"
      : "bg-primary text-primary-foreground hover:bg-primary/90";
  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
}
