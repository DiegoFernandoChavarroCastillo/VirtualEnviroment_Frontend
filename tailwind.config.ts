import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        space: {
          900: '#03040c',
          800: '#070a1a',
          700: '#0c1230',
          600: '#161c3f',
        },
        neon: {
          cyan: '#22d3ee',
          violet: '#a855f7',
          magenta: '#ec4899',
          blue: '#3b82f6',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        display: ['Orbitron', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 12px rgba(34, 211, 238, 0.55), 0 0 30px rgba(34, 211, 238, 0.25)',
        'glow-violet': '0 0 12px rgba(168, 85, 247, 0.55), 0 0 30px rgba(168, 85, 247, 0.25)',
        'glow-magenta': '0 0 12px rgba(236, 72, 153, 0.55), 0 0 30px rgba(236, 72, 153, 0.25)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(34, 211, 238, 0.45), 0 0 24px rgba(34, 211, 238, 0.2)' },
          '50%': { boxShadow: '0 0 22px rgba(34, 211, 238, 0.85), 0 0 44px rgba(34, 211, 238, 0.45)' },
        },
        'twinkle': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        'twinkle': 'twinkle 3s ease-in-out infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'scan-line': 'scan-line 8s linear infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
      },
      backgroundImage: {
        'grid-faint': "linear-gradient(rgba(34, 211, 238, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.06) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid-32': '32px 32px',
      },
      screens: {
        xs: '420px',
      },
    },
  },
  plugins: [],
} satisfies Config
