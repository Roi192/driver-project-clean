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
        heebo: ["Heebo", "sans-serif"],
        rubik: ["Rubik", "sans-serif"],
        playfair: ["Playfair Display", "serif"],
      },
      colors: {
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
        teal: {
          DEFAULT: "hsl(var(--teal))",
          light: "hsl(var(--teal-light))",
          dark: "hsl(var(--teal-dark))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          light: "hsl(var(--gold-light))",
          dark: "hsl(var(--gold-dark))",
        },
        olive: {
          DEFAULT: "hsl(var(--olive))",
          light: "hsl(var(--olive-light))",
          dark: "hsl(var(--olive-dark))",
        },
        sand: {
          DEFAULT: "hsl(var(--sand))",
          dark: "hsl(var(--sand-dark))",
        },
        cream: "hsl(var(--cream))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1.5rem",
        "3xl": "2rem",
        "4xl": "2.5rem",
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
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "25%": { transform: "translateY(-20px) rotate(1deg)" },
          "50%": { transform: "translateY(-10px) rotate(0deg)" },
          "75%": { transform: "translateY(-15px) rotate(-1deg)" },
        },
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 30px hsl(42 85% 55% / 0.3), 0 0 60px hsl(180 50% 30% / 0.2)",
          },
          "50%": {
            boxShadow: "0 0 50px hsl(42 85% 55% / 0.5), 0 0 100px hsl(180 50% 30% / 0.3)",
          },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(50px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 3s linear infinite",
        float: "float 12s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "slide-up": "slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-elite": "linear-gradient(135deg, hsl(200 35% 12%) 0%, hsl(180 50% 20%) 50%, hsl(75 35% 25%) 100%)",
        "gradient-gold": "linear-gradient(135deg, hsl(42 85% 55%) 0%, hsl(38 85% 42%) 100%)",
        "gradient-primary": "linear-gradient(135deg, hsl(180 50% 30%) 0%, hsl(180 55% 22%) 100%)",
      },
      boxShadow: {
        "luxury": "0 25px 80px -20px hsl(200 35% 12% / 0.25)",
        "gold": "0 8px 32px -6px hsl(42 85% 55% / 0.4)",
        "emblem": "0 20px 60px -10px hsl(42 85% 55% / 0.3), 0 10px 30px -5px hsl(180 50% 30% / 0.2)",
        "card-hover": "0 20px 60px -15px hsl(180 50% 30% / 0.2), 0 0 0 1px hsl(42 85% 55% / 0.5)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
