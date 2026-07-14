import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#EBF3FF", 100: "#D6E6FF", 200: "#ADCCFF", 300: "#7FADFF",
          400: "#4D88F0", 500: "#1266E3", 600: "#0052CC", 700: "#0043A6",
          800: "#003580", 900: "#0D1B52",
        },
        navy: "#0D1B52",
        goldbg: "#FDF3DC",
        gold: "#B8860B",
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
