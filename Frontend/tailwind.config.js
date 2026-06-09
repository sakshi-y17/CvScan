/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'app-bg': 'var(--app-bg)',
        'app-accent': 'var(--app-accent)',
        'app-accent-hover': 'var(--app-accent-hover)',
        'app-accent-light': 'var(--app-accent-light)',
        'app-text-primary': 'var(--app-text-primary)',
        'app-text-secondary': 'var(--app-text-secondary)',
        'app-border': 'var(--app-border)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 24px 80px rgba(106, 27, 69, 0.08)',
      },
    },
  },
  plugins: [],
};
