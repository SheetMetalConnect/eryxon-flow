# Dependency Audit Report

**Generated:** December 23, 2025
**Project:** Eryxon MES (eryxon-flow)

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Security Vulnerabilities | 0 | ✅ Clean |
| Outdated (Major) | 2 | ⚠️ Review needed |
| Outdated (Minor/Patch) | 11 | 🔄 Safe to update |
| Unused Dependencies | 9 | 🗑️ Can remove |
| Heavy Dependencies | 4 | 📦 Justified |

---

## 1. Security Vulnerabilities

```
npm audit: 0 vulnerabilities found
```

✅ **No security issues detected.** The project has a clean security audit.

---

## 2. Outdated Packages

### Major Version Updates (Breaking Changes Possible)

| Package | Current | Latest | Risk | Recommendation |
|---------|---------|--------|------|----------------|
| `react` / `react-dom` | 18.3.1 | 19.2.3 | High | **Hold** - React 19 has breaking changes. Defer until ecosystem stabilizes. |
| `react-resizable-panels` | 3.0.6 | 4.0.15 | Medium | **Review** - Check changelog for breaking changes before upgrading. |

### Safe Updates (Minor/Patch)

These can be updated with minimal risk:

```bash
npm update @supabase/supabase-js i18next lucide-react react-day-picker \
  react-hook-form react-i18next react-router-dom recharts \
  swagger-ui-react three zod
```

| Package | Current | Latest |
|---------|---------|--------|
| `@supabase/supabase-js` | 2.86.2 | 2.89.0 |
| `i18next` | 25.7.1 | 25.7.3 |
| `lucide-react` | 0.556.0 | 0.562.0 |
| `react-day-picker` | 9.12.0 | 9.13.0 |
| `react-hook-form` | 7.68.0 | 7.69.0 |
| `react-i18next` | 16.4.0 | 16.5.0 |
| `react-router-dom` | 7.10.1 | 7.11.0 |
| `recharts` | 3.5.1 | 3.6.0 |
| `swagger-ui-react` | 5.30.3 | 5.31.0 |
| `three` | 0.181.2 | 0.182.0 |
| `zod` | 4.1.13 | 4.2.1 |

---

## 3. Unused Dependencies (Bloat)

The following packages are installed but **not used** in application code:

### Can Remove Immediately

| Package | Size Impact | Notes |
|---------|-------------|-------|
| `@fontsource/inter-tight` | ~500KB | Never imported - only `@fontsource/inter` is used |
| `@radix-ui/react-aspect-ratio` | ~20KB | UI wrapper exists but not imported |
| `@radix-ui/react-hover-card` | ~30KB | UI wrapper exists but not imported |
| `@radix-ui/react-context-menu` | ~40KB | UI wrapper exists but not imported |
| `@radix-ui/react-menubar` | ~40KB | UI wrapper exists but not imported |
| `@radix-ui/react-navigation-menu` | ~35KB | UI wrapper exists but not imported |
| `embla-carousel-react` | ~50KB | carousel.tsx exists but not used |
| `input-otp` | ~15KB | input-otp.tsx exists but not used |
| `vaul` | ~25KB | drawer.tsx exists but not used |

**Estimated savings:** ~750KB unpacked, ~100KB+ from bundle

### Removal Commands

```bash
# Remove unused dependencies
npm uninstall @fontsource/inter-tight \
  @radix-ui/react-aspect-ratio \
  @radix-ui/react-hover-card \
  @radix-ui/react-context-menu \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  embla-carousel-react \
  input-otp \
  vaul

# Also remove unused UI wrapper components
rm src/components/ui/aspect-ratio.tsx
rm src/components/ui/hover-card.tsx
rm src/components/ui/context-menu.tsx
rm src/components/ui/menubar.tsx
rm src/components/ui/navigation-menu.tsx
rm src/components/ui/carousel.tsx
rm src/components/ui/input-otp.tsx
rm src/components/ui/drawer.tsx
```

### Dev Dependency Review

| Package | Notes |
|---------|-------|
| `lovable-tagger` | Platform-specific dev tool (Lovable.dev). **Keep if using Lovable platform**, remove otherwise. |

---

## 4. Heavy Dependencies (Justified Usage)

These packages are large but actively used:

| Package | Approx Size | Used In | Justification |
|---------|-------------|---------|---------------|
| `three` | ~2.5MB | `src/components/STEPViewer.tsx` | 3D STEP file viewer |
| `swagger-ui-react` | ~8MB | `src/pages/common/ApiDocs.tsx` | API documentation |
| `react-pdf` | ~4MB | `src/components/PDFViewer.tsx` | PDF document viewer |
| `recharts` | ~1.5MB | Analytics dashboards | Charts and graphs |

### Optimization Opportunities

1. **Lazy load heavy components** - Use `React.lazy()` for:
   - `STEPViewer` (three.js)
   - `ApiDocs` (swagger-ui-react)
   - `PDFViewer` (react-pdf)

2. **Code splitting** - These features are not used on every page:
   ```tsx
   const STEPViewer = React.lazy(() => import('@/components/STEPViewer'));
   const ApiDocs = React.lazy(() => import('@/pages/common/ApiDocs'));
   ```

---

## 5. Recommendations

### Immediate Actions

1. **Remove unused packages** (saves ~750KB):
   ```bash
   npm uninstall @fontsource/inter-tight @radix-ui/react-aspect-ratio \
     @radix-ui/react-hover-card @radix-ui/react-context-menu \
     @radix-ui/react-menubar @radix-ui/react-navigation-menu \
     embla-carousel-react input-otp vaul
   ```

2. **Apply safe updates**:
   ```bash
   npm update
   ```

3. **Delete unused UI component files** (after package removal)

### Short-term

1. **Implement lazy loading** for heavy components (three.js, swagger-ui, react-pdf)
2. **Review `react-resizable-panels` v4** changelog before upgrading
3. **Evaluate `lovable-tagger`** - remove if not using Lovable platform

### Long-term

1. **Monitor React 19** - Wait for ecosystem maturity before upgrading
2. **Consider lighter alternatives**:
   - `swagger-ui-react` → Static API docs or lighter solution
   - `recharts` → `@visx/xychart` for smaller bundle if only using basic charts

---

## 6. Package.json Cleanup

After removing unused dependencies, the `dependencies` section should have:

```diff
- "@fontsource/inter-tight": "^5.2.7",
- "@radix-ui/react-aspect-ratio": "^1.1.8",
- "@radix-ui/react-context-menu": "^2.2.16",
- "@radix-ui/react-hover-card": "^1.1.15",
- "@radix-ui/react-menubar": "^1.1.16",
- "@radix-ui/react-navigation-menu": "^1.2.14",
- "embla-carousel-react": "^8.6.0",
- "input-otp": "^1.4.2",
- "vaul": "^1.1.2",
```

---

## Appendix: Full Dependency Count

- **Production dependencies:** 57 packages
- **Dev dependencies:** 17 packages
- **After cleanup:** 48 production packages (-9)
