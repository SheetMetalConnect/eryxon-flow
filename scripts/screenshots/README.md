# Docs screenshots

Regenerates the operator-terminal screenshots used on the website
(`website/src/content/docs/features/operator-terminal.md` and friends).

The shots are taken against a **DEV-only** route, `/__screenshot/terminal`
(`src/pages/dev/TerminalScreenshot.tsx`), which mounts the real `DetailPanel`
with data mirroring the bundled demo dataset (`src/lib/mockDataGenerator.ts`).
No backend or login is needed — the panel renders from props, and the few
Supabase reads it makes fail silently.

```bash
cp .env.example .env          # any non-empty Supabase values are fine
npm run dev                   # serves http://127.0.0.1:8080
node scripts/screenshots/capture-terminal.mjs
```

Outputs (PNG, 2× DPI, light theme) to `website/src/assets/`:

- `operator-terminal-detail-desktop` / `-mobile` — the Steps tab
- `operator-terminal-batch-desktop` — the Batch tab
- `operator-terminal-location-desktop` — the Location tab (next-cell flow)

Notes:

- Playwright resolves from the project or a global install; Chromium falls back
  to `PLAYWRIGHT_CHROMIUM` or the preinstalled sandbox path.
- If your dev server can't bind IPv6 (`EAFNOSUPPORT :::8080`), start it with an
  IPv4 host (`npm run dev -- --host 127.0.0.1`) and pass `BASE_URL` to match.
