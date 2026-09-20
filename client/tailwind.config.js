/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: {
          light: '#F0F0F0',
          dark: '#121212',
        },
        panel: {
          light: '#FFFFFF',
          dark: '#1A1A1A',
        },
        primary: {
          DEFAULT: '#D02020',
          hover: '#B01818',
        },
        secondary: {
          DEFAULT: '#1040C0',
          hover: '#0C3096',
        },
        accent: {
          yellow: '#F0C020',
          'yellow-light': '#FFF9C4',
        },
        stark: '#121212',
      },
      boxShadow: {
        'bauhaus-sm': '3px 3px 0px 0px #121212',
        'bauhaus-md': '4px 4px 0px 0px #121212',
        'bauhaus-lg': '6px 6px 0px 0px #121212',
        'bauhaus-xl': '8px 8px 0px 0px #121212',
        'bauhaus-dark-sm': '3px 3px 0px 0px #FFFFFF',
        'bauhaus-dark-md': '4px 4px 0px 0px #FFFFFF',
        'bauhaus-dark-lg': '6px 6px 0px 0px #FFFFFF',
        'bauhaus-dark-xl': '8px 8px 0px 0px #FFFFFF',
      },
      fontFamily: {
        sans: ['Outfit', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
};
