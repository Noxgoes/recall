/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Use content instead of purge
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#FFFFFF',
          secondary: '#F9F8FF',
          tertiary: '#F1EDFF',
        },
        text: {
          primary: '#1A153B',
          secondary: '#7A7593',
          muted: '#AFAAC0',
          inverse: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#6E5BFF',
          dim: '#6E5BFF10',
          border: '#6E5BFF30',
        },
        border: {
          DEFAULT: '#EDEAF7',
          strong: '#D8D3ED',
          accent: '#6E5BFF30',
        }
      },
      fontFamily: {
        display: ['Outfit_700Bold'],
        body: ['Inter_400Regular'],
        'body-medium': ['Inter_500Medium'],
        mono: ['JetBrainsMono_400Regular'],
      },
      fontSize: {
        '4xl': 56,
        '3xl': 44,
        '2xl': 34,
        xl: 26,
        lg: 20,
        md: 17,
        base: 15,
        sm: 13,
        xs: 11,
      }
    }
  },
  plugins: []
}
