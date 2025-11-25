# Open Source Release Documentation

This folder contains planning documentation for the open-source release of Eryxon Flow.

> **Note:** These documents are for internal planning. Once the release is complete, relevant docs will be moved to appropriate locations.

---

## Documents

| Document | Description |
|----------|-------------|
| [OPEN_SOURCE_RELEASE_PLAN.md](./OPEN_SOURCE_RELEASE_PLAN.md) | Master plan with phases and decisions |
| [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) | Actionable checklist for release tasks |
| [QUICK_START.md](./QUICK_START.md) | 10-minute setup guide (draft) |
| [SELF_HOSTING_GUIDE.md](./SELF_HOSTING_GUIDE.md) | Complete deployment guide (draft) |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contributor guidelines (draft) |

---

## Quick Summary

### What We're Doing

- Removing all billing/pricing code
- Making all features available to everyone
- Providing easy Docker-based deployment
- Defaulting to "Bring Your Own Supabase" (cloud)
- Keeping multi-tenancy for multi-site companies

### Business Model

Open source with revenue from:
- Consulting (especially self-hosted Supabase setup)
- Custom integrations
- Support contracts
- Training

### Key Decisions Made

| Decision | Choice |
|----------|--------|
| License | MIT (pending final confirmation) |
| Multi-tenancy | Keep |
| Default deployment | Supabase Cloud |
| Demo data | Use existing seed scripts |
| Git history | Fresh repo (wipe history) |

---

## Next Steps

1. Review the [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)
2. Decide on final license
3. Begin Phase 1 (remove billing code)
4. Work through checklist sequentially

---

## Post-Release File Locations

After release, files will move to:

| Current | Final Location |
|---------|----------------|
| `QUICK_START.md` | `docs/QUICK_START.md` |
| `SELF_HOSTING_GUIDE.md` | `docs/SELF_HOSTING_GUIDE.md` |
| `CONTRIBUTING.md` | `/CONTRIBUTING.md` (root) |
| `RELEASE_CHECKLIST.md` | Archive/delete |
| `OPEN_SOURCE_RELEASE_PLAN.md` | Archive/delete |
| `README.md` (this file) | Delete |

---

*Status: Planning Phase*
