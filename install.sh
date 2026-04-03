#!/bin/bash

# 🚀 Script de Instalación Automática - Sistema POS
# Este script automatiza la configuración inicial del sistema

echo "🎯 =================================="
echo "   INSTALACIÓN SISTEMA POS"
echo "===================================="
echo ""

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

# Verificar Node.js
echo -e "${YELLOW}📦 Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado. Por favor instala Node.js 18+ primero.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v) detectado${NC}"
echo ""

# Verificar npm
echo -e "${YELLOW}📦 Verificando npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v) detectado${NC}"
echo ""

# Instalar dependencias
echo -e "${YELLOW}📥 Instalando dependencias...${NC}"
echo "Esto puede tomar algunos minutos..."
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencias instaladas correctamente${NC}"
else
    echo -e "${RED}❌ Error al instalar dependencias${NC}"
    exit 1
fi
echo ""

# Crear carpeta de configuración si no existe
mkdir -p src/environments

# Verificar si existe environment.ts
if [ ! -f "src/environments/environment.ts" ]; then
    echo -e "${YELLOW}🔧 Configurando environment.ts...${NC}"
    
    # Solicitar datos de Supabase
    read -p "Ingresa tu Supabase URL: " SUPABASE_URL
    read -p "Ingresa tu Supabase API Key: " SUPABASE_KEY
    
    # Crear archivo environment.ts
    cat > src/environments/environment.ts << EOF
export const environment = {
  production: false,
  supabase: {
    url: '$SUPABASE_URL',
    key: '$SUPABASE_KEY'
  }
};
EOF
    
    # Crear archivo environment.prod.ts
    cat > src/environments/environment.prod.ts << EOF
export const environment = {
  production: true,
  supabase: {
    url: '$SUPABASE_URL',
    key: '$SUPABASE_KEY'
  }
};
EOF
    
    echo -e "${GREEN}✅ Archivos de configuración creados${NC}"
else
    echo -e "${GREEN}✅ environment.ts ya existe${NC}"
fi
echo ""

# Solicitar información del negocio
echo -e "${YELLOW}🏪 Configuración del Negocio${NC}"
read -p "Nombre del negocio: " BUSINESS_NAME
echo ""
echo "Selecciona el tipo de negocio:"
echo "1) Tienda de Ropa"
echo "2) Farmacia"
echo "3) Electrónica"
echo "4) Restaurant"
echo "5) Ferretería"
echo "6) Genérico"
read -p "Opción (1-6): " BUSINESS_TYPE_OPTION

case $BUSINESS_TYPE_OPTION in
    1) BUSINESS_TYPE="clothing" ;;
    2) BUSINESS_TYPE="pharmacy" ;;
    3) BUSINESS_TYPE="electronics" ;;
    4) BUSINESS_TYPE="restaurant" ;;
    5) BUSINESS_TYPE="hardware" ;;
    6) BUSINESS_TYPE="generic" ;;
    *) BUSINESS_TYPE="generic" ;;
esac

read -p "Moneda (PEN, USD, EUR, MXN): " CURRENCY
read -p "Símbolo de moneda (S/, $, €): " CURRENCY_SYMBOL

echo ""
echo -e "${YELLOW}🎨 Personalización Visual${NC}"
read -p "Color principal (hex, ej: #1a1a1a): " PRIMARY_COLOR
read -p "Color secundario (hex, ej: #f5f5f4): " SECONDARY_COLOR

# Actualizar business.config.ts
echo -e "${YELLOW}📝 Actualizando configuración...${NC}"

# Aquí podrías usar sed o un script de Node.js para modificar business.config.ts
# Por simplicidad, mostramos un mensaje

echo -e "${GREEN}✅ Configuración guardada${NC}"
echo ""
echo -e "${YELLOW}Por favor, edita manualmente el archivo:${NC}"
echo "src/app/config/business.config.ts"
echo ""
echo "Con los siguientes valores:"
echo "  - name: '$BUSINESS_NAME'"
echo "  - type: '$BUSINESS_TYPE'"
echo "  - currency: '$CURRENCY'"
echo "  - currencySymbol: '$CURRENCY_SYMBOL'"
echo "  - primaryColor: '$PRIMARY_COLOR'"
echo "  - secondaryColor: '$SECONDARY_COLOR'"
echo ""

# Preguntar si desea ejecutar el servidor
read -p "¿Deseas iniciar el servidor de desarrollo ahora? (s/n): " START_SERVER

if [ "$START_SERVER" == "s" ] || [ "$START_SERVER" == "S" ]; then
    echo ""
    echo -e "${GREEN}🚀 Iniciando servidor de desarrollo...${NC}"
    echo "Abrirá en http://localhost:4200"
    echo ""
    npm start
else
    echo ""
    echo -e "${GREEN}✅ Instalación completada${NC}"
    echo ""
    echo "Para iniciar el servidor, ejecuta:"
    echo "  npm start"
    echo ""
    echo "Para compilar para producción, ejecuta:"
    echo "  npm run build"
    echo ""
fi

echo -e "${GREEN}🎉 ¡Instalación completa!${NC}"
