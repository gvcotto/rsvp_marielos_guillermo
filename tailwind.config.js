/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#2E2E2E",
        champagne: "#F7E7CE",
        rose: {
          50: "#FBE9E6",
          100: "#F2D3CC",
          300: "#E6B7A9",
          500: "#B76E79",
        },
      },
      boxShadow: {
        soft: "0 20px 60px rgba(183,110,121,.20)",
      },
    },
  },
  plugins: [],
};
