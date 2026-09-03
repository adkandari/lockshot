import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#EFEDEA',
        surface: '#FFFFFF',
        tray: '#E3E0DB',
        ink: {
          DEFAULT: '#191A1C',
          2: '#6B6C70',
          3: '#9B9C9F',
        },
        line: 'rgba(25, 26, 28, 0.10)',
        'line-soft': 'rgba(25, 26, 28, 0.06)',
        model: {
          DEFAULT: '#0F7FD8',
          soft: 'rgba(15, 127, 216, 0.10)',
        },
        live: '#1B9E5F',
      },
      borderRadius: {
        'lg': '22px',
        'md': '14px',
        'sm': '9px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(25, 26, 28, 0.04), 0 12px 28px -18px rgba(25, 26, 28, 0.28)',
      },
      fontFamily: {
        'schibsted': ['var(--font-schibsted)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        'jetbrains': ['var(--font-jetbrains)', 'Courier New', 'monospace'],
        'roboto-condensed': ['var(--font-roboto-condensed)', 'Arial Narrow', 'Impact', 'sans-serif'],
        'courier-prime': ['var(--font-courier-prime)', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
