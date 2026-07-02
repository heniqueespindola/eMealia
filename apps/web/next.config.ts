import type { NextConfig } from 'next';

const config: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'i.ytimg.com' },
      { hostname: '*.supabase.co' },
      { hostname: 'img.spoonacular.com' },
    ],
  },
};

export default config;
