/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        body: ['Roboto', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#2E7D32',
          600: '#1B5E20',
          700: '#166534',
          800: '#14532d',
          900: '#0f3d1e',
        },
        accent: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#F59E0B',
          500: '#d97706',
          600: '#b45309',
        },
        billar: {
          green: '#1B5E20',
          'green-light': '#2E7D32',
          amber: '#F59E0B',
          'amber-dark': '#d97706',
          felt: '#1a4a1a',
        },
      },
    },
  },
  plugins: [],
};
