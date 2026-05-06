/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: false, // ✅ force light mode
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};