/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#FF2BB1',
          rose: '#FF4FA3',
          dark: '#0a0314',
          ink: '#050208'
        }
      }
    }
  },
  plugins: []
};
