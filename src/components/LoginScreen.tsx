import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import Logo from "@/components/Logo";
import LanguageSelector from "@/components/LanguageSelector";
import { signInWithPassword, isAuthed, refreshAuthSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function LoginScreen() {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    if (isAuthed()) {
      navigate({ to: "/dashboard" });
      return;
    }
    void refreshAuthSession().then((ok) => {
      if (ok) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailRef.current?.value.trim() ?? "";
    const password = passwordRef.current?.value ?? "";
    if (!email || !password) return;
    setError("");
    setLoading(true);
    const result = await signInWithPassword(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.message ?? "Sign in failed. Check the email and password.");
      passwordRef.current?.focus();
      return;
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden grad-aurora text-white">
      <div className="absolute right-4 top-4 z-20">
        <LanguageSelector />
      </div>

      {/* Decorative orbs */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="pointer-events-none absolute -top-32 -left-32 h-[36rem] w-[36rem] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(closest-side, oklch(0.45 0.06 80 / 0.35), transparent)",
        }}
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: "easeOut", delay: 0.1 }}
        className="pointer-events-none absolute -bottom-40 -right-32 h-[40rem] w-[40rem] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(closest-side, oklch(0.4 0.08 260 / 0.5), transparent)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
        <div className="mb-10 flex items-center gap-3">
          <div className="rounded-xl bg-white/95 p-2 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]">
            <Logo className="h-10 w-auto" />
          </div>
        </div>

        <div className="glass-dark relative w-full rounded-3xl p-8 luxe-shadow">
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              {t("login.welcome")}
            </h1>
            <p className="mt-1.5 text-sm text-white/65">{t("login.subtitle")}</p>
          </div>

          <form onSubmit={onSubmit} className="relative z-10 space-y-4">
            <Field
              icon={<Mail className="h-4 w-4" />}
              id="login-email"
              inputRef={emailRef}
              type="email"
              placeholder={t("login.email")}
              autoComplete="email"
              defaultValue="Admin@admin.com"
              autoFocus
            />
            <Field
              icon={<Lock className="h-4 w-4" />}
              id="login-password"
              inputRef={passwordRef}
              type="password"
              placeholder={t("login.password")}
              autoComplete="current-password"
            />
            {error && (
              <p className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                {error}
              </p>
            )}

            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.985 }}
              disabled={loading}
              className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-[oklch(0.18_0.02_260)] font-medium tracking-tight transition-all hover:bg-white/95 disabled:opacity-70"
              type="submit"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {t("login.signIn")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-[11px] uppercase tracking-[0.18em] text-white/40">
            {t("login.staffOnly")}
          </p>
        </div>

        <p className="mt-8 text-xs text-white/40">
          © {new Date().getFullYear()} Shades &amp; Space. All rights reserved.
        </p>
      </div>
    </main>
  );
}

function Field({
  icon,
  id,
  inputRef,
  type,
  placeholder,
  autoComplete,
  defaultValue,
  autoFocus = false,
}: {
  icon: React.ReactNode;
  id: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  type: string;
  placeholder: string;
  autoComplete?: string;
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="group flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 transition-colors focus-within:border-white/35 focus-within:bg-white/[0.09] focus-within:ring-2 focus-within:ring-white/15"
    >
      <span
        aria-hidden
        className="pointer-events-none text-white/50 group-focus-within:text-white/80"
      >
        {icon}
      </span>
      <input
        id={id}
        ref={inputRef}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        className="login-field-input h-full w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none focus-visible:outline-none"
      />
    </label>
  );
}
