

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@shadcn/ui/**/*.js"
  ],
  theme: {
     extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6", // main blue
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate")
  ],
};

// /** @type {import('tailwindcss').Config} */
// const defaultConfig = require("shadcn/ui/tailwind.config")

// module.exports = {
//   ...defaultConfig,
//   content: ["./index.html", "./src/**/*.{js,jsx}", "*.{js,ts,jsx,tsx,mdx}"],
//   theme: {
//     ...defaultConfig.theme,
//     extend: {
//       ...defaultConfig.theme.extend,
//       colors: {
//         ...defaultConfig.theme.extend.colors,
//         primary: {
//           ...defaultConfig.theme.extend.colors.primary,
//           50: "#eff6ff",
//           100: "#dbeafe",
//           500: "#3b82f6",
//           600: "#2563eb",
//           700: "#1d4ed8",
//         },
//       },
//       borderRadius: {
//         lg: "var(--radius)",
//         md: "calc(var(--radius) - 2px)",
//         sm: "calc(var(--radius) - 4px)",
//       },
//     },
//   },
//   plugins: [...defaultConfig.plugins, require("tailwindcss-animate")],
// }
