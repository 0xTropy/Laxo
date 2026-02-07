/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      colors: {
        laxo: {
          bg: '#0a0e17',
          card: '#111827',
          border: '#1f2937',
          muted: '#6b7280',
          accent: '#06b6d4',
          accentDim: '#0891b2',
          gold: '#eab308',
          surface: '#0f172a',
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        glow: 'glow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glow: {
          '0%': { opacity: '0.6' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
