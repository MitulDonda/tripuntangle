import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    screens: {
      'xs': '400px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Ghibli Dark palette (PRD §3.1)
        'bg-base':     '#0D1117',
        'bg-surface':  '#161B22',
        'bg-elevated': '#21262D',
        'accent-forest': '#3D8B5E',
        'accent-sky':    '#5B9BD5',
        'accent-sun':    '#F5A623',
        'accent-bloom':  '#C65D7B',
        'text-primary':  '#E6EDF3',
        'text-muted':    '#7D8590',
        border:          '#30363D',
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        accent:  ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-forest-sky': 'linear-gradient(135deg, #3D8B5E, #5B9BD5)',
      },
    },
  },
  plugins: [],
}

export default config
