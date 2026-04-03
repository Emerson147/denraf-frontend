/**
 * 🏪 CONFIGURACIÓN DEL NEGOCIO
 * 
 * Este archivo centraliza TODA la configuración del sistema.
 * Modifica aquí para adaptar el sistema a diferentes negocios.
 */

export interface BusinessConfig {
  // 🏢 INFORMACIÓN DEL NEGOCIO
  business: {
    name: string;
    type: 'clothing' | 'pharmacy' | 'electronics' | 'restaurant' | 'hardware' | 'generic';
    currency: string;
    currencySymbol: string;
    timezone: string;
    language: 'es' | 'en';
  };

  // 🎨 PERSONALIZACIÓN DE MARCA
  branding: {
    logo: string;
    favicon: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
  };

  // 📦 MÓDULOS ACTIVADOS
  modules: {
    inventory: boolean;
    pos: boolean;
    clients: boolean;
    sales: boolean;
    reports: boolean;
    analytics: boolean;
    goals: boolean;
    users: boolean;
  };

  // 🏷️ CAMPOS PERSONALIZADOS POR TIPO DE NEGOCIO
  productFields: {
    sizes: boolean;          // Tallas (ropa)
    colors: boolean;         // Colores (ropa)
    brand: boolean;          // Marca (ropa, electrónica)
    model: boolean;          // Modelo (electrónica)
    serial: boolean;         // Número de serie (electrónica)
    expirationDate: boolean; // Fecha de vencimiento (farmacia, alimentos)
    batch: boolean;          // Lote (farmacia)
    prescription: boolean;   // Requiere receta (farmacia)
    warranty: boolean;       // Garantía (electrónica)
    ingredients: boolean;    // Ingredientes (restaurant)
  };

  // 💳 TIPOS DE VENTA
  saleTypes: {
    enabled: boolean;
    types: Array<{
      id: string;
      name: string;
      icon: string;
    }>;
  };

  // 🎫 CONFIGURACIÓN DE TICKET
  ticket: {
    showLogo: boolean;
    showQR: boolean;
    showBarcode: boolean;
    footerMessage: string;
    businessInfo: {
      address: string;
      phone: string;
      email: string;
      ruc: string;
    };
  };
}

// ============================================
// 🔥 CONFIGURACIÓN ACTUAL (IMPORTACIONES DENRAF)
// ============================================
export const BUSINESS_CONFIG: BusinessConfig = {
  business: {
    name: 'Importaciones DenRaf',
    type: 'clothing',
    currency: 'PEN',
    currencySymbol: 'S/',
    timezone: 'America/Lima',
    language: 'es',
  },

  branding: {
    logo: '/icons/logo.svg',
    favicon: '/favicon.ico',
    primaryColor: '#1a1a1a',      // Negro minimalista
    secondaryColor: '#f5f5f4',    // Piedra claro
    accentColor: '#78716c',       // Piedra medio
    fontFamily: 'Inter, sans-serif',
  },

  modules: {
    inventory: true,
    pos: true,
    clients: true,
    sales: true,
    reports: true,
    analytics: true,
    goals: true,
    users: true,
  },

  productFields: {
    sizes: true,          // ✅ Ropa tiene tallas
    colors: true,         // ✅ Ropa tiene colores
    brand: true,          // ✅ Marca de la prenda
    model: false,         // ❌ No aplica para ropa
    serial: false,        // ❌ No aplica para ropa
    expirationDate: false,// ❌ Ropa no vence
    batch: false,         // ❌ No aplica
    prescription: false,  // ❌ No es farmacia
    warranty: false,      // ❌ Ropa no tiene garantía
    ingredients: false,   // ❌ No es restaurant
  },

  saleTypes: {
    enabled: true,
    types: [
      { id: 'store', name: 'Tienda', icon: 'store' },
      { id: 'fair', name: 'Feria', icon: 'festival' },
      { id: 'online', name: 'Online', icon: 'language' },
    ],
  },

  ticket: {
    showLogo: true,
    showQR: true,
    showBarcode: true,
    footerMessage: '¡Gracias por tu compra! 🎉',
    businessInfo: {
      address: 'Av. Principal 123, Lima, Perú',
      phone: '+51 987 654 321',
      email: 'ventas@denraf.com',
      ruc: '20123456789',
    },
  },
};

// ============================================
// 📋 CONFIGURACIONES PRE-DEFINIDAS POR TIPO DE NEGOCIO
// ============================================

export const PRESET_CONFIGS: Record<string, Partial<BusinessConfig>> = {
  // 👕 TIENDA DE ROPA
  clothing: {
    productFields: {
      sizes: true,
      colors: true,
      brand: true,
      model: false,
      serial: false,
      expirationDate: false,
      batch: false,
      prescription: false,
      warranty: false,
      ingredients: false,
    },
    saleTypes: {
      enabled: true,
      types: [
        { id: 'store', name: 'Tienda', icon: 'store' },
        { id: 'fair', name: 'Feria', icon: 'festival' },
        { id: 'online', name: 'Online', icon: 'language' },
      ],
    },
  },

  // 💊 FARMACIA
  pharmacy: {
    productFields: {
      sizes: false,
      colors: false,
      brand: true,
      model: false,
      serial: false,
      expirationDate: true,  // ✅ Fecha de vencimiento crítica
      batch: true,           // ✅ Lote
      prescription: true,    // ✅ Requiere receta
      warranty: false,
      ingredients: true,     // ✅ Principio activo
    },
    saleTypes: {
      enabled: false,
      types: [],
    },
  },

  // 📱 ELECTRÓNICA
  electronics: {
    productFields: {
      sizes: false,
      colors: true,
      brand: true,
      model: true,          // ✅ Modelo del producto
      serial: true,         // ✅ IMEI, serial
      expirationDate: false,
      batch: false,
      prescription: false,
      warranty: true,       // ✅ Garantía
      ingredients: false,
    },
    saleTypes: {
      enabled: false,
      types: [],
    },
  },

  // 🍔 RESTAURANT
  restaurant: {
    productFields: {
      sizes: true,          // ✅ Personal, mediano, grande
      colors: false,
      brand: false,
      model: false,
      serial: false,
      expirationDate: false,
      batch: false,
      prescription: false,
      warranty: false,
      ingredients: true,    // ✅ Ingredientes
    },
    saleTypes: {
      enabled: true,
      types: [
        { id: 'dine-in', name: 'Mesa', icon: 'table_restaurant' },
        { id: 'takeout', name: 'Para llevar', icon: 'takeout_dining' },
        { id: 'delivery', name: 'Delivery', icon: 'delivery_dining' },
      ],
    },
  },

  // 🔧 FERRETERÍA
  hardware: {
    productFields: {
      sizes: true,          // ✅ Medidas (pulgadas, cm)
      colors: true,
      brand: true,
      model: true,
      serial: false,
      expirationDate: false,
      batch: true,
      prescription: false,
      warranty: true,
      ingredients: false,
    },
    saleTypes: {
      enabled: false,
      types: [],
    },
  },

  // 🏪 GENÉRICO
  generic: {
    productFields: {
      sizes: false,
      colors: false,
      brand: true,
      model: false,
      serial: false,
      expirationDate: false,
      batch: false,
      prescription: false,
      warranty: false,
      ingredients: false,
    },
    saleTypes: {
      enabled: false,
      types: [],
    },
  },
};
