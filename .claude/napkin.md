# Napkin Runbook

## Execution & Validation
1. **[2026-10-08] Vite build does not typecheck TypeScript**
   Do instead: run `npx tsc --noEmit` alongside `npm run build`.

## Auth Behavior
1. **[2026-10-08] Supabase recovery and offline temporary passwords are separate flows**
   Do instead: handle `PASSWORD_RECOVERY` with Supabase Auth and keep temporary-password logic confined to the offline fallback.
