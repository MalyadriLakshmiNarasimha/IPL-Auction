import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dusk: "#08090B",
        night: {
          DEFAULT: "#111214",
          raised: "#191A1D",
          border: "#2B2B2D",
        },
        floodlight: {
          DEFAULT: "#F4F0E6",
          muted: "#A6A29A",
          subtle: "#716D65",
        },
        turf: {
          DEFAULT: "#1FA36B",
          glow: "rgba(31, 163, 107, 0.35)",
        },
        flare: {
          DEFAULT: "#D6B65D",
          hover: "#E6C96F",
          glow: "rgba(214, 182, 93, 0.32)",
        },
        hammer: {
          DEFAULT: "#FF3B4E",
          glow: "rgba(255, 59, 78, 0.4)",
        },
        role: {
          bat: "#F5B83D",
          bowl: "#4C8DFF",
          ar: "#2FCB8F",
          wk: "#A56BFF",
        },
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", "ui-monospace", "Impact", "sans-serif"],
        sans: ["'DM Sans'", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
        pill: "999px",
      },
      boxShadow: {
        flare: "0 0 28px rgba(214, 182, 93, 0.24)",
        turf: "0 0 25px rgba(31, 163, 107, 0.45)",
        hammer: "0 0 25px rgba(255, 59, 78, 0.45)",
        scoreboard: "inset 0 2px 4px rgba(0,0,0,0.6), 0 8px 30px rgba(0,0,0,0.5)",
      },
      keyframes: {
        pulseFlare: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(214, 182, 93, 0.2)" },
          "50%": { boxShadow: "0 0 35px rgba(214, 182, 93, 0.45)" },
        },
        gavelStrike: {
          "0%": { transform: "rotate(-35deg) translateY(-20px)", opacity: "0" },
          "50%": { transform: "rotate(15deg) translateY(0px)", opacity: "1" },
          "70%": { transform: "rotate(0deg) translateY(0px)" },
          "100%": { transform: "rotate(0deg) translateY(0px)" },
        },
        stampIn: {
          "0%": { transform: "scale(2.5) rotate(-15deg)", opacity: "0" },
          "60%": { transform: "scale(0.9) rotate(-10deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(-8deg)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-4px)" },
          "40%, 80%": { transform: "translateX(4px)" },
        },
      },
      animation: {
        "pulse-flare": "pulseFlare 1.2s infinite ease-in-out",
        "gavel-strike": "gavelStrike 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "stamp-in": "stampIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        shake: "shake 0.3s ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;

