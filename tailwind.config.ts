import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2196F3',
          hover: '#1976D2',
          pressed: '#1565C0',
          light: '#E3F2FD',
        },
        success: '#4CAF50',
        warning: '#FF9800',
        danger: '#F44336',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"Cascadia Code"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
} satisfies Config