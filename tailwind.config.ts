import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#FF1493',
          rose: '#FF4FA3',
          dark: '#0A0A0A',
          ink: '#111111'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif']
      },
      backgroundImage: {
        'rainbow':
          'linear-gradient(90deg,#ff0018 0%,#ffa52c 16%,#ffff41 33%,#008018 50%,#0000f9 66%,#86007d 83%,#ff0018 100%)',
        'rainbow-radial':
          'conic-gradient(from 0deg,#ff0018,#ffa52c,#ffff41,#008018,#0000f9,#86007d,#ff0018)'
      },
      animation: {
        glow: 'glow 3s ease-in-out infinite',
        spinSlow: 'spin 12s linear infinite'
      },
      keyframes: {
        glow: {
          '0%,100%': { filter: 'drop-shadow(0 0 10px rgba(255,20,147,.4))' },
          '50%': { filter: 'drop-shadow(0 0 30px rgba(255,20,147,.9))' }
        }
      }
    }
  },
  plugins: []
} satisfies Config;
