/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2f8',
          100: '#d5deef',
          200: '#aab9dc',
          300: '#7a91c4',
          400: '#4f6da8',
          500: '#3a5289',
          600: '#2C355E',
          700: '#232b4a',
          800: '#1a2038',
          900: '#121626',
        },
        accent: {
          yellow: '#FFD700',
          red: '#E53935',
        },
      },
    },
  },
  plugins: [],
}
