/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#0a0a1a',
          900: '#13132b',
          850: '#161634',
          800: '#1e1e42',
          750: '#24244d',
          700: '#2d2d5a',
          650: '#353568',
          600: '#3e3e75',
        },
        accent: {
          green: '#4ade80',
          'green-dark': '#22c55e',
          'green-light': '#86efac',
          yellow: '#fbbf24',
          blue: '#60a5fa',
          purple: '#c084fc',
          pink: '#f472b6',
          red: '#f87171',
        },

      },


      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

    },
  },
  plugins: [],
}
