/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B1020',
        panel: '#121A33',
        accent: '#7C5CFF',
        mint: '#2DD4A7',
        gold: '#FFC24B',
        rose: '#FF5C7A',
      },
      fontFamily: { display: ['Sora', 'Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}

