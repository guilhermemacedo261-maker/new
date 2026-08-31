import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        buteco: {
          black: '#0b0c0e',
          charcoal: '#15171a',
          card: '#1c1f23',
          white: '#f5f5f0',
          red: '#e4392e',
          green: '#2fae4e',
          gold: '#d4af37',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 14px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
