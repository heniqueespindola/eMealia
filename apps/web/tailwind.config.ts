import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bgDark:      '#1B2632',
        bgDarkAlt:   '#2C3B4D',
        border:      '#C9C1B1',
        bgLight:     '#EEE9DF',
        primary:     '#FFB162',
        primaryDark: '#A35139',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'serif'],
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
};

export default config;
