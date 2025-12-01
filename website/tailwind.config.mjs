/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design system colors from DESIGN_SYSTEM.md
        background: '#111927',           // Deep navy - ambient background
        foreground: '#fafafa',
        muted: '#404040',
        'muted-foreground': '#a3a3a3',
        accent: '#1e90ff',               // Dodger Blue - brand primary
        'accent-2': '#4a9eff',           // Light Blue - brand primary light
        card: '#141b29',                 // Card surface
        border: '#262626',
        success: '#34a853',              // Green
        warning: '#fbbc05',              // Yellow
        error: '#ea4335',                // Red
        info: '#0891b2',                 // Cyan
        // Manufacturing status colors
        'status-active': '#fbbc05',      // Yellow - timing active
        'status-completed': '#34a853',   // Green - finished
        'status-on-hold': '#f97316',     // Orange - paused
        'status-blocked': '#ea4335',     // Red - cannot proceed
        'status-pending': '#9ca3af',     // Gray - not started
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'gradient-shift': 'gradient-shift 6s ease infinite',
        'typing': 'typing 3s steps(40, end), blink 0.75s step-end infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 20s infinite ease-in-out',
      },
      keyframes: {
        'fade-in-up': {
          from: {
            opacity: '0',
            transform: 'translateY(2rem)',
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
            'box-shadow': '0 0 20px rgba(168, 85, 247, 0.4)',
          },
          '50%': {
            'box-shadow': '0 0 40px rgba(168, 85, 247, 0.6)',
          },
        },
        float: {
          '0%, 100%': {
            transform: 'translate(0, 0) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -30px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
        },
      },
      backgroundSize: {
        '400%': '400% 400%',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}