/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#14432e",
          dark: "#0d2e1f",
          light: "#1f5a3e",
          accent: "#22a06b",
          50: "#eef6f1",
          100: "#dbeae1",
        },
        cream: {
          50: "#fbf8f1",
          100: "#f6f1e6",
          200: "#ebe3d0",
          300: "#dccfb1",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.02)",
        pop: "0 8px 24px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)",
      },
      fontFamily: {
        sans: ['"Heebo"', '"Rubik"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
