/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Zamutints brand colors
        zamu: {
          cyan: '#36B9EB',        // Primary accent blue rgb(54, 185, 235)
          'cyan-light': '#62CAFA', // Hover state rgb(98, 202, 250)
          'cyan-dark': '#2A9BC9',  // Darker accent
          black: '#000000',        // Primary background
          'gray-dark': '#1B1B1B',  // Dark gray borders rgb(27, 27, 27)
          'gray-medium': '#919191', // Medium gray rgb(145, 145, 145)
          'gray-light': '#F7F7F7', // Light gray rgb(247, 247, 247)
          white: '#FFFFFF',
        },
        // Alias dark colors for component compatibility
        dark: {
          300: '#919191',
          400: '#6B6B6B',
          500: '#4A4A4A',
          600: '#333333',
          700: '#262626',
          800: '#1B1B1B',
          900: '#0D0D0D',
        },
        primary: {
          50: '#E8F8FD',
          100: '#D1F1FB',
          200: '#A3E3F7',
          300: '#75D5F3',
          400: '#62CAFA',
          500: '#36B9EB',
          600: '#2A9BC9',
          700: '#1F7DA7',
          800: '#145F85',
          900: '#0A4163',
        },
      },
      fontFamily: {
        // Zamutints fonts
        serif: ['"Old Standard TT"', 'Georgia', 'serif'],
        display: ['Cinzel', 'serif'],
        accent: ['Adamina', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'zamu': '0 2px 6px rgba(0, 0, 0, 0.3)',
        'zamu-lg': '0 4px 12px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
