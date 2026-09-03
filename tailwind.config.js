/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#08090C',
          900: '#0D0F14',
          850: '#12151C',
          800: '#171B24',
          750: '#1E232E',
          700: '#252C3A',
          600: '#323B4E',
        },
        primary: {
          50: '#EBF5FF',
          100: '#E1EFFE',
          400: '#76A9FA',
          500: '#3F83F8',
          600: '#2A75F3',
          700: '#1A56DB',
        },
        accent: {
          cyan: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
          violet: '#8B5CF6',
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px -3px rgba(42, 117, 243, 0.3)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.3)',
      }
    },
  },
  plugins: [],
}
