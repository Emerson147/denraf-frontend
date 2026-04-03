/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,css}",
  ],
  darkMode: 'class',
  theme: {
    extend: {},
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
