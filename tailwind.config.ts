import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1200px" }
    },
    extend: {
      colors: {
        ink: {
          50: "#f7f7f8",
          100: "#eeeef0",
          200: "#d6d6db",
          400: "#7d7d86",
          700: "#2a2a2f",
          900: "#0e0e10"
        },
        brand: {
          50: "#eef4ff",
          100: "#dbe6ff",
          500: "#3b6bff",
          600: "#234fe0",
          700: "#1a3cad"
        },
        accent: {
          500: "#f59e0b"
        }
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Inter", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
