/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe7ff',
          200: '#b9d0ff',
          300: '#8fb0ff',
          400: '#648cff',
          500: '#3b6dff',
          600: '#3156d8',
          700: '#2b46ad',
          800: '#263d89',
          900: '#202f64',
        },
        surface: {
          DEFAULT: '#08090c',
          50: '#151821',
          100: '#0e1016',
          200: '#0b0d12',
          300: '#08090c',
        },
        glass: 'rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #3b6dff 0%, #8b5cf6 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0e1016 0%, #08090c 100%)',
        'gradient-glass': 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.018) 100%)',
      },
      boxShadow: {
        glow: '0 18px 60px -24px rgba(59, 109, 255, 0.85)',
        glass: '0 24px 80px -42px rgba(0,0,0,0.85)',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
