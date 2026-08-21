/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Civic Trust Theme A - Deep Navy + Teal brand
        navy: {
          50:  '#e8edf3',
          100: '#c5d1de',
          200: '#9fb2c7',
          300: '#7993af',
          400: '#597b9c',
          500: '#3a6389',
          600: '#2f5278',
          700: '#223e60',
          800: '#162d48',
          900: '#0d1f33',
          950: '#08121e',
        },
        civic: {
          teal:   '#0E7C7B',
          green:  '#2E8B57',
          amber:  '#E8A33D',
          red:    '#C0392B',
          fog:    '#F4F6F8',
          slate:  '#5A6472',
        },
        brand: {
          blue: '#1A56DB',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card':  '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px 0 rgba(0,0,0,0.05)',
        'card-md': '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.05)',
        'card-lg': '0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -2px rgba(0,0,0,0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-in':   'slideIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
