/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kohei: {
          background: "var(--background)",
          primary: "var(--primary)",
          text: "var(--foreground)",
          muted: "var(--muted)",
          card: "var(--card)",
          success: "var(--success)",
          warning: "var(--warning)",
          danger: "var(--danger)"
        }
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        body: ["IBM Plex Sans", "system-ui", "sans-serif"]
      },
      boxShadow: {
        kohei: "0 24px 60px -40px var(--shadow)"
      }
    }
  },
  plugins: []
};
