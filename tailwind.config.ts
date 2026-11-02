import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: 'var(--bg-void)',
        electric: 'var(--accent-green)',
        neon: 'var(--accent-purple)',
        gold: 'var(--accent-gold)',
        glass: 'var(--glass-fill)',
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'sans-serif'],
        serif: ['var(--font-instrument)', 'serif'],
      },
      letterSpacing: {
        display: '-0.04em',
      },
      lineHeight: {
        display: '0.95',
      },
      transitionTimingFunction: {
        liquid: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
