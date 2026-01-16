import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        lele: {
          bg: '#0f172a',
          panel: '#1e293b',
          border: '#334155',
          accent: '#3b82f6',
          highlight: '#22c55e',
        },
      },
    },
  },
  plugins: [],
};

export default config;
