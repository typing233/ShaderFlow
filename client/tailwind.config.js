/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'shader-dark': '#0a0a0f',
        'shader-darker': '#050508',
        'shader-gray': '#1a1a2e',
        'shader-light': '#2a2a4e',
        'shader-accent': '#8b5cf6',
        'shader-cyan': '#06b6d4',
      }
    },
  },
  plugins: [],
}
