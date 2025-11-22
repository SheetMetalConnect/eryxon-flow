import type { Config } from "tailwindcss";

export default {
  // Dark mode only - no class toggle needed
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: [
          '"Inter"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          '"Roboto"',
          '"Oxygen"',
          '"Ubuntu"',
          '"Cantarell"',
          '"Fira Sans"',
          '"Droid Sans"',
          '"Helvetica Neue"',
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          '"Monaco"',
          '"Inconsolata"',
          '"Roboto Mono"',
          '"Courier New"',
          "monospace",
        ],
      },
      colors: {
        border: "hsl(var(--border))",
        "border-subtle": "hsl(var(--border-subtle))",
        input: "hsl(var(--input))",
        "input-background": "hsl(var(--input-background))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          hover: "hsl(var(--destructive-hover))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          hover: "hsl(var(--accent-hover))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          elevated: "hsl(var(--surface-elevated))",
          hover: "hsl(var(--surface-hover))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // MES Status Colors
        "status-active": "hsl(var(--status-active))",
        "status-completed": "hsl(var(--status-completed))",
        "status-on-hold": "hsl(var(--status-on-hold))",
        "status-blocked": "hsl(var(--status-blocked))",
        "status-pending": "hsl(var(--status-pending))",
        // Issue Severity Colors
        "severity-critical": "hsl(var(--severity-critical))",
        "severity-high": "hsl(var(--severity-high))",
        "severity-medium": "hsl(var(--severity-medium))",
        "severity-low": "hsl(var(--severity-low))",
        // Stage Colors
        "stage-default": "hsl(var(--stage-default))",
        "stage-cutting": "hsl(var(--stage-cutting))",
        "stage-bending": "hsl(var(--stage-bending))",
        "stage-welding": "hsl(var(--stage-welding))",
        "stage-assembly": "hsl(var(--stage-assembly))",
        "stage-finishing": "hsl(var(--stage-finishing))",
        // Issue Status Colors
        "issue-pending": "hsl(var(--issue-pending))",
        "issue-approved": "hsl(var(--issue-approved))",
        "issue-rejected": "hsl(var(--issue-rejected))",
        "issue-closed": "hsl(var(--issue-closed))",
        // Alert Backgrounds
        "alert-info-bg": "hsl(var(--alert-info-bg))",
        "alert-info-border": "hsl(var(--alert-info-border))",
        "alert-success-bg": "hsl(var(--alert-success-bg))",
        "alert-success-border": "hsl(var(--alert-success-border))",
        "alert-warning-bg": "hsl(var(--alert-warning-bg))",
        "alert-warning-border": "hsl(var(--alert-warning-border))",
        "alert-error-bg": "hsl(var(--alert-error-bg))",
        "alert-error-border": "hsl(var(--alert-error-border))",
        // Code Blocks
        "code-bg": "hsl(var(--code-background))",
        "code-fg": "hsl(var(--code-foreground))",
        // Operation Types
        "operation-milling": "hsl(var(--operation-milling))",
        "operation-welding": "hsl(var(--operation-welding))",
        "operation-default": "hsl(var(--operation-default))",
        // Operator Actions
        "operator-start": "hsl(var(--operator-start))",
        "operator-pause": "hsl(var(--operator-pause))",
        "operator-resume": "hsl(var(--operator-resume))",
        "operator-complete": "hsl(var(--operator-complete))",
        "operator-issue": "hsl(var(--operator-issue))",
        // Semantic Colors
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          hover: "hsl(var(--success-hover))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          hover: "hsl(var(--warning-hover))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          hover: "hsl(var(--info-hover))",
        },
        // Brand colors
        brand: {
          primary: "hsl(var(--brand-primary))",
          "primary-light": "hsl(var(--brand-primary-light))",
          accent: "hsl(var(--brand-accent))",
        },
        // Glass morphism
        glass: {
          background: "hsl(var(--glass-background))",
          border: "hsl(var(--glass-border))",
        },
        // Gradient orbs
        gradient: {
          blue: "hsl(var(--gradient-blue))",
          yellow: "hsl(var(--gradient-yellow))",
          green: "hsl(var(--gradient-green))",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        base: "var(--radius-base)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      spacing: {
        xs: "var(--space-xs)",
        sm: "var(--space-sm)",
        base: "var(--space-base)",
        md: "var(--space-md)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
        "2xl": "var(--space-2xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-base)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        glass: "var(--shadow-glass)",
      },
      backdropBlur: {
        glass: "var(--glass-blur)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        fadeInUp: {
          from: {
            opacity: "0",
            transform: "translateY(30px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        float: {
          "0%, 100%": {
            transform: "translate(0, 0) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -30px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
        },
        pulse: {
          "0%, 100%": {
            opacity: "1",
          },
          "50%": {
            opacity: "0.5",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fadeInUp 0.8s ease-out",
        float: "float 20s infinite ease-in-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      transitionDuration: {
        base: "150ms",
        smooth: "200ms",
        slow: "300ms",
      },
      transitionTimingFunction: {
        "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
        "ease-out": "cubic-bezier(0, 0, 0.2, 1)",
        "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
