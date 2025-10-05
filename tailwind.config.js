/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette for PNKSTR dashboard
        primary: {
          white: '#FFFFFF',
          black: '#000000',
          gray: {
            100: '#E5E7EB',
            400: '#9CA3AF',
            600: '#6B7280',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '8px': '8px',
        '16px': '16px',
        '24px': '24px',
      }
    },
  },
  plugins: [],
}
