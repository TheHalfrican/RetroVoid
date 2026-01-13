/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base
        'void-black': '#0a0a0f',
        'deep-purple': '#1a1025',
        'midnight-blue': '#0d1b2a',
        // Neon Accents
        'neon-cyan': '#00f5ff',
        'neon-magenta': '#ff00ff',
        'neon-orange': '#ff6b35',
        'electric-blue': '#4d7cff',
        // Glass
        'glass-white': 'rgba(255, 255, 255, 0.05)',
        'glass-border': 'rgba(255, 255, 255, 0.1)',
      },
      fontFamily: {
        'display': ['Orbitron', 'sans-serif'],
        'body': ['JetBrains Mono', 'monospace'],
        'accent': ['Bebas Neue', 'sans-serif'],
      },
      backgroundImage: {
        'holo-gradient': 'linear-gradient(135deg, rgba(0, 245, 255, 0.2), rgba(255, 0, 255, 0.2), rgba(255, 255, 0, 0.2))',
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 245, 255, 0.5)',
        'neon-magenta': '0 0 20px rgba(255, 0, 255, 0.5)',
        'neon-orange': '0 0 20px rgba(255, 107, 53, 0.5)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'flicker': 'flicker 0.15s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.95' },
        },
      },
    },
  },
  plugins: [],
}
