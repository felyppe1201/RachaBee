/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#F9D902",
        secondary: "#ffffff",
        blackapp: "#0A0A0A",
        lightGray: "#eceeec",
        bgScreen: "#f1f7fa",
        hlpink: "#D90251",
        hlpinkmd: "#A3003C",
        hlblue: "#067E9A",
        hlbluemd: "#035E74",
        mdprimary: "#BBA300",
        blprimary: "#857400",
      },
    },
  },
  plugins: [],
};
