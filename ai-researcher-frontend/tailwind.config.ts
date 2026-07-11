import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F0EFE9",
        paperDim: "#E6E4DA",
        surface: "#FAFAF7",
        ink: "#1D2430",
        inkSoft: "#4A5264",
        line: "#D8D5C8",
        amber: {
          DEFAULT: "#C9862B",
          soft: "#E8C593",
          deep: "#8F5D17",
        },
        teal: {
          DEFAULT: "#2F6F62",
          soft: "#9FC2B8",
          deep: "#1E4A40",
        },
        rust: "#A6462B",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        grid: "linear-gradient(to right, #D8D5C8 1px, transparent 1px), linear-gradient(to bottom, #D8D5C8 1px, transparent 1px)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(29,36,48,0.06), 0 6px 16px -8px rgba(29,36,48,0.15)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
