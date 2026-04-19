/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f8f5ef",
          100: "#efe6d6",
          200: "#dbc8aa",
          300: "#c5a177",
          400: "#a77d4f",
          500: "#885f36",
          600: "#6f4b2a",
          700: "#57391f",
          800: "#3f2815",
          900: "#27190d",
        },
        mist: {
          50: "#f3fbfa",
          100: "#d6f5f0",
          200: "#ace9df",
          300: "#74d3c4",
          400: "#37b5a6",
          500: "#1c9689",
          600: "#18786f",
          700: "#175f59",
          800: "#174c48",
          900: "#153f3c",
        },
        ember: {
          50: "#fff5eb",
          100: "#ffe2c7",
          200: "#ffc78f",
          300: "#ff9d4d",
          400: "#f6781c",
          500: "#d75e12",
          600: "#b14410",
          700: "#8d3213",
          800: "#712816",
          900: "#5d2216",
        },
      },
      boxShadow: {
        panel: "0 18px 60px rgba(17, 28, 33, 0.12)",
        glow: "0 0 0 1px rgba(255, 255, 255, 0.16), 0 20px 40px rgba(15, 23, 42, 0.22)",
      },
      fontFamily: {
        display: ["Space Grotesk", "IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
