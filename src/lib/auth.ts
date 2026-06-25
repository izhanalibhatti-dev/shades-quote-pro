const KEY = "sas.session";

type LoginResult = {
  ok: boolean;
  message?: string;
};

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function signIn() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch (_error) {
    // Session storage can be unavailable in private or restricted browser contexts.
  }
}

export function signOut() {
  try {
    sessionStorage.removeItem(KEY);
  } catch (_error) {
    // Session storage can be unavailable in private or restricted browser contexts.
  }
  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    navigator.sendBeacon("/api/auth/logout");
    return;
  }
  void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
}

export async function signInWithPassword(email: string, password: string): Promise<LoginResult> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = (await response.json().catch(() => null)) as LoginResult | null;
    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        message: payload?.message ?? "Sign in failed. Check the email and password.",
      };
    }
    signIn();
    return { ok: true };
  } catch {
    return { ok: false, message: "Sign in failed. Check your connection and try again." };
  }
}

export async function refreshAuthSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as LoginResult | null;
    if (response.ok && payload?.ok) {
      signIn();
      return true;
    }
  } catch {
    // Treat failed checks as signed out.
  }
  signOut();
  return false;
}
