import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Eco / recycling green — primary brand
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        // Reward theme (Gold/Black mockup)
        gold: {
          light: "#F7E7A6",
          DEFAULT: "#D4AF37",
          dark: "#A67C00",
        },
        ink: {
          DEFAULT: "#0B0F0C",
          soft: "#14181A",
          card: "#1B2124",
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', '"IBM Plex Sans Thai"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 24 40 / 0.04), 0 4px 14px -4px rgb(16 24 40 / 0.08)",
        float: "0 12px 34px -6px rgb(16 24 40 / 0.16)",
        brand: "0 4px 14px -2px rgb(22 163 74 / 0.45)",
        gold: "0 0 0 1px rgba(212,175,55,0.35), 0 8px 30px rgba(212,175,55,0.18)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
        "3xl": "1.6rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "backdrop-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out",
        "scale-in": "scale-in 0.2s cubic-bezier(0.16,1,0.3,1)",
        "slide-up": "slide-up 0.3s cubic-bezier(0.16,1,0.3,1)",
        "backdrop-in": "backdrop-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
