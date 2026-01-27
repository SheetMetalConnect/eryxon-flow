# Project Status: Automated Self-Hosting Deployment

## ✅ Completed & Working
- **One-Click Automation**: `scripts/automate_self_hosting.sh` is now a robust master script that handles:
    - Dependency installation (`pg`, `dotenv`).
    - Supabase `config.toml` patching.
    - Project linking via CLI.
    - Database migrations (schema + seed data).
    - Edge Function deployment.
- **Database Schema**: Hard reset performed and fully restored with:
    - Default tenant (`00000000-0000-0000-0000-000000000000`).
    - Profile and Admin Role for `luke@sheetmetalconnect.com`.
    - 4 Storage Buckets (Parts, Issues, CAD).
    - 5 Cron Jobs for background tasks.
- **Critical Fixes**:
    - **Auth Trigger**: Recreated the missing `on_auth_user_created` trigger on `auth.users`, ensuring new signups automatically get profiles and tenants.
    - **Frontend URLs**: Removed 9 hardcoded fallback URLs that were pointing to a legacy project ID.
    - **Vite Stability**: Identified and bypassed WebSocket `RSV1` crash by switching dev port to `5173`.
- **Documentation**: 
    - Created `docs/MIGRATION_TROUBLESHOOTING.md` detailing 7 major issues and their fixes.
    - Updated `docs/SELF_HOSTING_GUIDE.md`.

## ⚠️ Known Issues / Next Steps
- **Edge Function Imports (502)**:
    - Functions using the `_shared` directory are hitting runtime 502 errors on Supabase.
    - `api-key-generate` (standalone) works perfectly.
    - *Resolution Required*: Standardize Deno `import_map.json` or bundle functions before deployment for production.
- **Frontend State**:
    - Seeding demo data via the UI requires the Edge Functions to be fully operational (due to 403/502 errors).

## 🚀 Deployment Command
To run the setup on a fresh instance:
```bash
export SUPABASE_DB_PASSWORD='your_password'
chmod +x scripts/automate_self_hosting.sh
./scripts/automate_self_hosting.sh
```

---
**Last Updated**: 2026-01-27
**Status**: Ready for testing (minus Edge Func 502s)
