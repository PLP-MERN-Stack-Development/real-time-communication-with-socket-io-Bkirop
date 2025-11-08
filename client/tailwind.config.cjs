/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      colors: {
        sidebar: "#1E1E2F",       // dark navy-purple-ish
        sidebarHover: "#2A2A40",
        bubbleMe: "#4F46E5",       // indigo
        bubbleOther: "#E5E7EB"     // gray-100-ish
      },
      backgroundImage: {
        "chat-gradient":
          "linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(16,185,129,0.12) 100%)",
        "sidebar-gradient":
          "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.95) 100%)"
      }
    }
  },
  plugins: []
}
