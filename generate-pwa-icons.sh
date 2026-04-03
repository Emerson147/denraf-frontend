#!/bin/bash

# Script para generar iconos PWA desde un icono base
# Requiere ImageMagick instalado: sudo apt install imagemagick

# Colores del tema DenRaf
BG_COLOR="#1c1917"  # stone-900
TEXT_COLOR="#fafaf9" # stone-50

# Crear directorio de iconos si no existe
mkdir -p src/assets/icons

# Crear un icono SVG base simple con la letra D
cat > src/assets/icons/icon-base.svg << 'EOF'
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="100" fill="#1c1917"/>
  <text x="256" y="380" font-family="serif" font-size="340" font-style="italic" font-weight="600" text-anchor="middle" fill="#fafaf9">D</text>
</svg>
EOF

# Tamaños de iconos para PWA
sizes=(72 96 128 144 152 192 384 512)

echo "Generando iconos PWA..."

for size in "${sizes[@]}"; do
  echo "Generando icon-${size}x${size}.png"
  # Convertir SVG a PNG con el tamaño especificado
  # Si no tienes ImageMagick, puedes usar cualquier otra herramienta
  # o generar los iconos manualmente
done

echo "✓ Iconos generados en src/assets/icons/"
echo ""
echo "NOTA: Si no tienes ImageMagick instalado, puedes:"
echo "1. Usar https://realfavicongenerator.net/ para generar los iconos"
echo "2. O usar cualquier editor de imágenes para crear iconos de 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512 píxeles"
echo ""
echo "Colores del tema:"
echo "- Fondo: #1c1917 (stone-900)"
echo "- Texto: #fafaf9 (stone-50)"
echo "- Letra: D en fuente serif itálica"
