/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'surface': '#f9f9f9',
        'surface-dark': '#0e0e0e',
        'surface-container-lowest': '#ffffff',
        'surface-container-lowest-dark': '#000000',
        'surface-container-low': '#f3f3f3',
        'surface-container-low-dark': '#131313',
        'surface-container-high': '#e8e8e8',
        'surface-container-high-dark': '#1f2020',
        'surface-container-highest': '#e2e2e2',
        'surface-container-highest-dark': '#262626',
        'primary': '#ff8c00',
        'primary-dark': '#ff9f4a',
        'primary-container': '#ff8c00',
        'primary-container-dark': '#fd8b00',
        'secondary': '#00658f',
        'secondary-dark': '#0cb6fd',
        'secondary-container': '#0cb6fd',
        'secondary-container-dark': '#00658f',
        'tertiary': '#904d00',
        'tertiary-dark': '#c3ffcd',
        'on-surface': '#1a1c1c',
        'on-surface-dark': '#ffffff',
        'on-surface-variant': '#564334',
        'on-surface-variant-dark': '#adaaaa',
        'outline-variant': '#ddc1ae',
        'outline-variant-dark': '#484848'
      },
      fontFamily: {
        'plus-jakarta-sans': ['Plus Jakarta Sans'],
      }
    },
  },
  plugins: [],
}
