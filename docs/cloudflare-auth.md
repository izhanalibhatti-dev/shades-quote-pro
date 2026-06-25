# Cloudflare Login Setup

The login is checked server-side by the Cloudflare Worker entry in `src/server.ts`.

## Production Variables

Set these in Cloudflare Pages/Workers for the production environment:

| Variable             | Value             |
| -------------------- | ----------------- |
| `APP_LOGIN_EMAIL`    | `Admin@admin.com` |
| `APP_LOGIN_PASSWORD` | `Muz`             |

`APP_LOGIN_EMAIL` is optional because the app defaults to `Admin@admin.com`, but setting it in Cloudflare makes the login configuration explicit.

## Behaviour

- The browser sends the email and password to `/api/auth/login`.
- The Worker compares them against Cloudflare environment variables.
- On success, the Worker sets an HttpOnly `sas_auth` cookie for 12 hours.
- `/dashboard`, `/project`, `/quote`, `/wardrobe`, and `/settings` redirect to `/` if the cookie is missing or invalid.
- Changing `APP_LOGIN_PASSWORD` invalidates old sessions because the session cookie is derived from the current password.

## Local Development

Local development accepts `Muz` when `APP_LOGIN_PASSWORD` is not configured. Production does not use that fallback; Cloudflare must have `APP_LOGIN_PASSWORD` set.
