/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#1e3a8a',
          navyDeep: '#172554',
          teal: '#0d9488',
          tealSoft: '#ccfbf1',
          mist: '#f8fafc'
        }
      },
      boxShadow: {
        soft: '0 4px 20px rgba(30, 58, 138, 0.08)',
        pop: '0 10px 30px rgba(13, 148, 136, 0.12)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
}