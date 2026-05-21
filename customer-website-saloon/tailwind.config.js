/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff5f5',
          100: '#ffe3e3',
          200: '#ffc9c9',
          300: '#ffa8a8',
          400: '#ff6b6b',
          500: '#fa5252',
          600: '#e03131',
          700: '#c92a2a',
        }
      },
      backgroundImage: {
        'hero-grid': "radial-gradient(circle at top left, rgba(220, 38, 38, 0.15), transparent 55%), radial-gradient(circle at top right, rgba(239, 68, 68, 0.15), transparent 60%), radial-gradient(circle at bottom, rgba(248, 113, 113, 0.18), transparent 65%)",
        'section-glow': 'linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, rgba(239, 68, 68, 0.05) 38%, rgba(248, 113, 113, 0.08) 100%)'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(32px)' },
          '100%': { opacity: '1', transform: 'translateY(0px)' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.9' }
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        fadeUp: 'fadeUp 0.9s ease-out forwards',
        pulseGlow: 'pulseGlow 3.6s ease-in-out infinite'
      }
    },
  },
  plugins: [],
}

