import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        'display': ['Inter', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'sp-display': ['Montserrat', 'system-ui', 'sans-serif'],
        'sp-body': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'sp-soft': 'var(--sp-shadow-soft)',
        'sp-md': 'var(--sp-shadow-md)',
        'sp-elegant': 'var(--sp-shadow-elegant)',
        'sp-pool': 'var(--sp-shadow-pool)',
      },
      colors: {
        sp: {
          primary: 'hsl(var(--sp-primary) / <alpha-value>)',
          'primary-fg': 'hsl(var(--sp-primary-foreground) / <alpha-value>)',
          'primary-50': 'hsl(var(--sp-primary-50) / <alpha-value>)',
          'primary-100': 'hsl(var(--sp-primary-100) / <alpha-value>)',
          'primary-600': 'hsl(var(--sp-primary-600) / <alpha-value>)',
          'primary-700': 'hsl(var(--sp-primary-700) / <alpha-value>)',
          bg: 'hsl(var(--sp-bg) / <alpha-value>)',
          card: 'hsl(var(--sp-card) / <alpha-value>)',
          fg: 'hsl(var(--sp-fg) / <alpha-value>)',
          muted: 'hsl(var(--sp-muted) / <alpha-value>)',
          'muted-fg': 'hsl(var(--sp-muted-fg) / <alpha-value>)',
          border: 'hsl(var(--sp-border) / <alpha-value>)',
          'border-strong': 'hsl(var(--sp-border-strong) / <alpha-value>)',
          success: 'hsl(var(--sp-success) / <alpha-value>)',
          danger: 'hsl(var(--sp-danger) / <alpha-value>)',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
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
        pool: {
          light: "hsl(var(--pool-light))",
          medium: "hsl(var(--pool-medium))",
          deep: "hsl(var(--pool-deep))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'sp-sm': 'var(--sp-radius-sm)',
        'sp': 'var(--sp-radius)',
        'sp-lg': 'var(--sp-radius-lg)',
        'sp-xl': 'var(--sp-radius-xl)',
        'sp-2xl': 'var(--sp-radius-2xl)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
