/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,css}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        slideDown: 'slideDown 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
      },
      keyframes: {
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
  // 🚀 OPTIMIZACIÓN: Eliminar CSS no usado solo en producción
  safelist: [
    // Clases dinámicas que Tailwind no puede detectar
    'bg-green-500',
    'bg-blue-500', 
    'bg-red-500',
    'bg-yellow-500',
    'text-green-500',
    'text-blue-500',
    'text-red-500',
    'text-yellow-500',
    // Clases de flex para el sidebar
    'flex',
    'flex-col',
    'flex-row',
    'hidden',
    'md:flex',
  ]
}
