/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design system colors - Inspired by mcp-obsidian.org
        background: '#09090b',           // Zinc 950 - Deep dark background
        foreground: '#fafafa',           // Zinc 50
        muted: '#27272a',                // Zinc 800
        'muted-foreground': '#a1a1aa',   // Zinc 400
        accent: '#3b82f6',               // Blue 500 - Primary accent
        'accent-2': '#60a5fa',           // Blue 400
        card: '#18181b',                 // Zinc 900
        border: '#27272a',               // Zinc 800
        success: '#10b981',              // Emerald 500
        warning: '#f59e0b',              // Amber 500
        error: '#ef4444',                // Red 500
        info: '#06b6d4',                 // Cyan 500

        // Manufacturing status colors (kept for compatibility but refined)
        'status-active': '#eab308',      // Yellow 500
        'status-completed': '#10b981',   // Emerald 500
        'status-on-hold': '#f97316',     // Orange 500
        'status-blocked': '#ef4444',     // Red 500
        'status-pending': '#71717a',     // Zinc 500
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'typing': 'typing 3s steps(40, end), blink 0.75s step-end infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
        'float': 'float 20s infinite ease-in-out',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'fade-in-up': {
          from: {
            opacity: '0',
            transform: 'translateY(1.5rem)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'gradient-shift': {
          '0%, 100%': {
            'background-position': '0% 50%',
          },
          '50%': {
            'background-position': '100% 50%',
          },
        },
        typing: {
          from: { width: '0' },
          to: { width: '100%' },
        },
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        glow: {
          '0%, 100%': {
            'box-shadow': '0 0 20px rgba(59, 130, 246, 0.2)',
          },
          '50%': {
            'box-shadow': '0 0 40px rgba(59, 130, 246, 0.4)',
          },
        },
        float: {
          '0%, 100%': {
            transform: 'translate(0, 0) scale(1)',
          },
          '33%': {
            transform: 'translate(20px, -20px) scale(1.05)',
          },
          '66%': {
            transform: 'translate(-15px, 15px) scale(0.95)',
          },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-glow': 'conic-gradient(from 90deg at 50% 50%, #00000000 50%, #09090b 100%), radial-gradient(rgba(200,200,200,0.1) 0%, transparent 80%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'neon': '0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)',
      },
    },
  },
  plugins: [],
}