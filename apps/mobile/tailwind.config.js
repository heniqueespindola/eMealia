/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
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
    },
  },
};
