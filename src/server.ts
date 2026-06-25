import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

const AUTH_COOKIE = "sas_auth";
const DEFAULT_LOGIN_EMAIL = "Admin@admin.com";
const DEV_LOGIN_PASSWORD = "Muz";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(request?: Request): Response {
  return withSecurityHeaders(
    new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    }),
    request,
  );
}

function withSecurityHeaders(response: Response, request?: Request): Response {
  const secured = new Response(response.body, response);
  secured.headers.set("x-content-type-options", "nosniff");
  secured.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  secured.headers.set("x-frame-options", "DENY");
  secured.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()",
  );
  secured.headers.set(
    "content-security-policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  if (request && new URL(request.url).protocol === "https:") {
    secured.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  return secured;
}

function readEnvString(env: unknown, key: string): string | undefined {
  if (!env || typeof env !== "object") return undefined;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getLoginEmail(env: unknown) {
  return readEnvString(env, "APP_LOGIN_EMAIL") ?? DEFAULT_LOGIN_EMAIL;
}

function getLoginPassword(env: unknown) {
  const configured = readEnvString(env, "APP_LOGIN_PASSWORD");
  if (configured) return configured;
  return import.meta.env.DEV ? DEV_LOGIN_PASSWORD : undefined;
}

function jsonResponse(payload: unknown, status = 200, request?: Request): Response {
  return withSecurityHeaders(
    new Response(JSON.stringify(payload), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    }),
    request,
  );
}

function getCookieValue(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) return rawValue.join("=");
  }
  return undefined;
}

function constantTimeEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function expectedSessionToken(env: unknown) {
  const password = getLoginPassword(env);
  if (!password) return undefined;
  return sha256Hex(`shades-space-session-v1:${getLoginEmail(env).toLowerCase()}:${password}`);
}

async function hasValidSession(request: Request, env: unknown) {
  const token = getCookieValue(request, AUTH_COOKIE);
  const expected = await expectedSessionToken(env);
  return Boolean(token && expected && constantTimeEqual(token, expected));
}

function authCookie(request: Request, value: string, maxAgeSeconds: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return [
    `${AUTH_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    secure.replace(/^; /, ""),
  ]
    .filter(Boolean)
    .join("; ");
}

function isPublicRequest(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/") return true;
  if (url.pathname.startsWith("/api/auth/")) return true;
  if (url.pathname.startsWith("/assets/")) return true;
  if (url.pathname.startsWith("/wardrobe-photos/")) return true;
  return /\.[a-zA-Z0-9]+$/.test(url.pathname);
}

async function handleAuthRequest(request: Request, env: unknown): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/auth/")) return undefined;

  if (url.pathname === "/api/auth/session") {
    return jsonResponse({ ok: await hasValidSession(request, env) }, 200, request);
  }

  if (url.pathname === "/api/auth/logout") {
    const response = jsonResponse({ ok: true }, 200, request);
    response.headers.append("set-cookie", authCookie(request, "", 0));
    return response;
  }

  if (url.pathname !== "/api/auth/login") {
    return jsonResponse({ ok: false, message: "Not found." }, 404, request);
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed." }, 405, request);
  }

  const password = getLoginPassword(env);
  if (!password) {
    return jsonResponse(
      { ok: false, message: "Login password is not configured on the server." },
      503,
      request,
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 2048) {
    return jsonResponse({ ok: false, message: "Login request is too large." }, 413, request);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, message: "Invalid login request." }, 400, request);
  }

  const fields = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const email = typeof fields.email === "string" ? fields.email.trim() : "";
  const submittedPassword = typeof fields.password === "string" ? fields.password : "";

  const emailOk = email.toLowerCase() === getLoginEmail(env).toLowerCase();
  const passwordOk = constantTimeEqual(submittedPassword, password);
  if (!emailOk || !passwordOk) {
    return jsonResponse({ ok: false, message: "Check the email and password." }, 401, request);
  }

  const sessionToken = await expectedSessionToken(env);
  if (!sessionToken) {
    return jsonResponse(
      { ok: false, message: "Login password is not configured on the server." },
      503,
      request,
    );
  }
  const response = jsonResponse({ ok: true }, 200, request);
  response.headers.append("set-cookie", authCookie(request, sessionToken, SESSION_MAX_AGE_SECONDS));
  return response;
}

async function requireSessionForAppPage(request: Request, env: unknown) {
  if (isPublicRequest(request)) return undefined;
  const acceptsHtml = request.headers.get("accept")?.includes("text/html") ?? false;
  if (!acceptsHtml) return undefined;
  if (await hasValidSession(request, env)) return undefined;
  return Response.redirect(new URL("/", request.url), 302);
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"}; try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const authResponse = await handleAuthRequest(request, env);
      if (authResponse) return authResponse;

      const redirectResponse = await requireSessionForAppPage(request, env);
      if (redirectResponse) return withSecurityHeaders(redirectResponse, request);

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response), request);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse(request);
    }
  },
};
