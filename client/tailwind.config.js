/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navbar: "var(--bg-navbar)",
        primary: "var(--brand-primary)",
        "primary-hover": "var(--brand-primary-hover)",
        accent: "var(--brand-accent)",

        modal: "var(--bg-modal)",
        section: "var(--bg-section)",
        overlay: "var(--bg-overlay)",

        textPrimary: "var(--text-primary)",
        textSecondary: "var(--text-secondary)",

        borderSoft: "var(--border-soft)",
        borderMedium: "var(--border-medium)",
      },
      boxShadow: {
        focus: "0 0 0 2px var(--focus-ring)",
      },
    },
  },
  plugins: [],
};
