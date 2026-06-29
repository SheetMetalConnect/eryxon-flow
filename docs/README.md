# `docs/` — contributor & coding internals ONLY

**There is no product or user documentation in this folder. Do not add any.**

Everything that explains how the app *works or is operated* — for operators, admins,
self-hosters, or evaluators — lives in **`website/`** (Astro/Starlight: docs guides +
features, blog, release notes). The website is the documentation.

This `docs/` folder is only for things that would be out of place on a public docs
site: ADRs (`docs/decisions/`), coding conventions, the DB schema diagram, route/hook
maps, and build/design-system internals.

## Rules

- **Never** write a feature explanation, a user/admin/operator flow, a setup or
  operations guide, troubleshooting, a glossary, or any "how X works" page here.
  It goes on the website.
- If you **find** such a page here, that is a bug: move and rewrite it into the
  website, fix the links, and delete the source.
- When in doubt, it belongs on the website.

See the Documentation policy in `.agents/README.md` and the root `CLAUDE.md`.
