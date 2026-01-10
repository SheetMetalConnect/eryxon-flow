---
title: "Visual Components"
description: "UI components and layout patterns"
---

See also: [Design Tokens](/architecture/design-tokens/), [Design Principles](/architecture/design-principles/), [Responsive Patterns](/architecture/responsive-ui-patterns/)

## Layout Foundations

### Glass Cards
Elevated surfaces use blur and saturation with translucent borders.
```css
.glass-card {
  backdrop-filter: blur(16px) saturate(180%);
  background-color: rgba(17, 25, 40, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.125);
}
```

### Admin Page Standards
All admin pages follow a compact, data-dense layout:
- **Page padding**: `p-4` (16px)
- **Section gap**: `space-y-4` (16px)
- **Header margin**: `mb-1` (4px)
- **Title size**: `text-2xl` (24px)

---

## Specialized Components

### Stat Cards
Standardized for manufacturing metrics (throughput, alerts, etc.).
```tsx
<StatCard
  title="Active Jobs"
  value={42}
  icon={PlayCircle}
  color="primary"
/>
```

### Hero Stack
The "narrative" stack for landing and onboarding pages:
1. **Icon Container**: Branded SVG or Lucide icon.
2. **Welcome Text**: Uppercase, tracked microcopy.
3. **Title Container**: Main heading + Preview pill.
4. **Title Divider**: Linear gradient separator.

---

## Responsive Patterns

### Tablet-First Operator View
- **Targets**: 44px minimum for touch.
- **Sidebar**: Collapsed icon-only on tablets, hidden on mobile.
- **Terminal View**: Right panel collapses into a drawer on smaller screens.

### PC-First Admin View
- **Data Tables**: Multi-column layouts with sticky headers.
- **Scroll Behavior**: Internal container scrolling to keep navigation visible.

---

## Getting Started

### UI Stack
1. **shadcn/ui**: Base primitives (Button, Input, Form).
2. **Tailwind CSS**: Utility classes for layout and custom tokens.
3. **AnimatedBackground**: Must be mounted before page content.

### Using Design System Classes
- `.cta-button`: Primary action styling with arrow nudge.
- `.informational-text`: Stylized capsules for empty states or tips.
- `.workflow-section`: Italicized callouts for procedural text.
- `.title-divider`: The standard brand line separator.
