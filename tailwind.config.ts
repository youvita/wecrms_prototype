import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // KB PRASAC brand — warm charcoal ramp (keeps white-on-primary readable)
        primary: {
          50: "#F6F5F3", 100: "#EBE8E3", 200: "#D8D2C9", 300: "#B8AFA2",
          400: "#8E8578", 500: "#6B635A", 600: "#4E4841", 700: "#3C3833",
          800: "#2C2925", 900: "#201D1A",
        },
        navy: "#3C3833",        // KB dark chrome (sidebar, brand panels)
        goldbg: "#FFF4D4",      // soft KB-yellow tint for accent panels
        gold: "#FFB600",        // KB Yellow — the signature accent
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans Khmer", "system-ui", "sans-serif"],
        khmer: ["Noto Sans Khmer", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
