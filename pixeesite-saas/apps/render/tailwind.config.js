/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/blocks/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--pxs-font-heading)', 'system-ui', 'sans-serif'],
        body: ['var(--pxs-font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
