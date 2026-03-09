# Eryxon Flow Docs Site

This folder contains the canonical documentation site for Eryxon Flow.

## Local Development

```bash
cd website
npm install
npm run dev
```

The docs site runs on `http://localhost:4321` by default.

## Content Structure

- `src/content/docs/` for published documentation pages
- `src/config/sidebar.json` for navigation structure
- `astro.config.mjs` for site and build configuration
- `wrangler.toml` for Cloudflare deployment settings

## Publishing Rules

- Keep product, architecture, engineering, and operations docs inside `src/content/docs/`
- Treat this site as the source of truth for release notes and changelog content
- Keep the repository root limited to the main `README.md` and application/runtime config files
