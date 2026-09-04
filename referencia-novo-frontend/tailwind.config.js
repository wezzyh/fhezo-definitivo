/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        fhezo: {
          50: "#eef8f1",
          100: "#d9f0df",
          200: "#b5dfc0",
          300: "#84c997",
          400: "#52af70",
          500: "#2f9555",
          600: "#217944",
          700: "#1c6139",
          800: "#194d30",
          900: "#153f29",
          950: "#092319",
        },

        ink: {
          50: "#f5f7f6",
          100: "#e7eae8",
          200: "#d0d5d2",
          300: "#adb5b0",
          400: "#818c85",
          500: "#616c65",
          600: "#4d5650",
          700: "#3e4641",
          800: "#242a27",
          900: "#151917",
          950: "#0a0d0b",
        },

        warm: {
          50: "#fafaf9",
          100: "#f5f5f3",
          200: "#e8e8e5",
        },

        warning: "#f6c500",
        danger: "#c63e3e",
      },

      fontFamily: {
        sans: ["Source Sans 3", "Arial", "sans-serif"],
        display: ["Barlow", "Arial Narrow", "sans-serif"],
      },

      boxShadow: {
        subtle: "0 1px 2px rgba(0,0,0,.06)",
        panel: "0 8px 30px rgba(12,18,14,.08)",
        drawer: "-18px 0 50px rgba(0,0,0,.18)",
      },

      borderRadius: {
        fhezo: "18px",
      },

      maxWidth: {
        store: "1520px",
      },
    },
  },

  plugins: [],
};