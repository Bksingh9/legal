import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1240px" }
    },
    extend: {
      colors: {
        ink: {
          50: "#f7f7f8",
          100: "#eeeef0",
          200: "#d6d6db",
          300: "#a1a1a8",
          400: "#5f5f64",
          700: "#2a2a2f",
          900: "#0e0e10"
        },
        // Dark canvas + warm white pair used across the refreshed marketing surface.
        night: {
          50: "#f5f5f7",
          100: "#e6e6ea",
          200: "#bcbcc4",
          400: "#6e6e78",
          700: "#1d1d22",
          800: "#131318",
          900: "#0a0a0b"
        },
        brand: {
          50: "#eef4ff",
          100: "#dbe6ff",
          500: "#3b6bff",
          600: "#234fe0",
          700: "#1a3cad"
        },
        accent: {
          50: "#fff8eb",
          200: "#fde2a1",
          400: "#fbbf3d",
          500: "#f5a524",
          600: "#d98612"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-display)", "ui-serif", "Georgia", "serif"]
      },
      fontSize: {
        display: ["clamp(2.75rem, 6vw + 1rem, 6rem)", { lineHeight: "0.98", letterSpacing: "-0.03em" }],
        hero: ["clamp(2.25rem, 4vw + 1rem, 4.5rem)", { lineHeight: "1.02", letterSpacing: "-0.025em" }]
      },
      keyframes: {
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" }
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" }
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" }
        }
      },
      animation: {
        "spin-slow": "spin-slow 40s linear infinite",
        marquee: "marquee 32s linear infinite",
        "fade-up": "fade-up 0.6s ease-out both",
        shimmer: "shimmer 8s linear infinite"
      },
      backgroundImage: {
        "mesh-hero":
          "radial-gradient(ellipse at 20% 10%, rgba(59,107,255,0.25), transparent 55%), radial-gradient(ellipse at 80% 0%, rgba(245,165,36,0.18), transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(59,107,255,0.18), transparent 60%)"
      }
    }
  },
  plugins: []
};

export default config;
