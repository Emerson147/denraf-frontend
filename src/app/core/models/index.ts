// ============================================
// MODELOS PRINCIPALES DE DENRAF
// ============================================

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock: number;
  barcode?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string;
  price: number;
  cost: number;
  stock: number; // Stock total (suma de todas las variantes)
  minStock: number;
  sizes: string[]; // Tallas disponibles
  colors?: string[]; // Colores disponibles
  variants?: ProductVariant[]; // Variantes (combinaciones talla+color)
  image: string | null;
  barcode?: string;
  status?: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface Sale {
  id: string;
  saleNumber: string; // Ej: "VENTA-001"
  date: Date;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'yape' | 'plin';
  status: 'completed' | 'pending' | 'cancelled';
  saleType: 'feria-acobamba' | 'feria-paucara' | 'tienda'; // 🎯 Tipo de venta
  customer?: Customer;
  notes?: string;
  createdBy: string; // Usuario que hizo la venta
  vendedorId: string; // ID del vendedor que realizó la venta
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  size: string;
  color?: string;
  unitPrice: number;
  subtotal: number;
  variantId?: string; // ID de la variante vendida (si aplica)
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  lastPurchaseDate?: Date;
  tier: 'nuevo' | 'silver' | 'gold';
  preferences?: string[];
}

// ============================================
// MOVIMIENTOS DE INVENTARIO
// ============================================

export interface InventoryMovement {
  id: string;
  movementNumber: string; // Ej: "MOV-001", "ENTRADA-001", "SALIDA-001"
  type: 'entrada' | 'salida' | 'ajuste' | 'devolucion';
  date: Date;
  productId: string;
  productName: string;
  variantId?: string;
  size?: string;
  color?: string;
  quantity: number;
  reason: string; // Motivo del movimiento
  reference?: string; // Número de venta, orden de compra, etc.
  cost?: number; // Costo unitario (para entradas)
  totalCost?: number; // Costo total
  createdBy: string; // Usuario que registró el movimiento
  notes?: string;
  supplier?: string; // Proveedor (para entradas)
  invoice?: string; // Número de factura/boleta
}

// ============================================
// MÉTRICAS DE FERIA (Modelo de Negocio)
// ============================================

export interface CapitalHealth {
  totalInvested: number; // Capital total invertido en inventario
  activeCapital: number; // Productos que rotan bien (<1 mes)
  slowCapital: number; // Productos lentos (1-2 meses)
  frozenCapital: number; // Productos estancados (>2 meses)
  liquidityRatio: number; // % de capital congelado
  targetLiberation: number; // Meta de liberación en 60 días
}

export interface ProductClassification {
  product: Product;
  classification: 'basico' | 'variedad' | 'estancado' | 'temporada';
  fairsSinceLastSale: number; // Número de ferias desde última venta
  daysSinceLastSale: number; // Días desde última venta
  totalSoldLastMonth: number; // Unidades vendidas último mes
  rotationPerFair: number; // Promedio de ventas por feria
  shouldReorder: boolean; // Si debe recomprarse
  shouldLiquidate: boolean; // Si debe liquidarse
}

export interface LiquidationSuggestion {
  product: Product;
  fairsWithoutSale: number; // Ferias sin venta
  daysWithoutSale: number; // Días sin venta
  costPrice: number; // Precio de costo
  currentPrice: number; // Precio actual
  liquidationPlan: {
    week1: { price: number; discount: number; profit: number }; // -20%
    week2: { price: number; discount: number; profit: number }; // -30%
    week3: { price: number; discount: number; profit: number }; // -40%
  };
  frozenCapital: number; // Capital congelado en este producto
  potentialRecovery: number; // Recuperación potencial si liquida en semana 1
}

export interface SupplierDebt {
  id: string;
  supplierName: string;
  totalDebt: number;
  purchaseDate: Date;
  daysSincePurchase: number;
  products: {
    productId: string;
    productName: string;
    quantity: number;
    cost: number;
    totalCost: number;
    quantitySold: number;
    revenue: number;
  }[];
  amountRecovered: number; // Dinero recuperado vendiendo productos
  amountPending: number; // Deuda pendiente
  recoveryPercentage: number; // % recuperado
  suggestedPayment: number; // Pago sugerido próxima feria
}

export interface FairPreparation {
  fairDate: Date;
  fairType: 'domingo' | 'jueves';
  productsToTake: {
    product: Product;
    quantity: number;
    reason: 'rotacion-alta' | 'liquidacion' | 'nuevo';
  }[];
  liquidationProducts: {
    product: Product;
    discountPercentage: number;
    newPrice: number;
  }[];
  totalInvestment: number; // Costo de productos a llevar
  projectedRevenue: { min: number; max: number }; // Proyección basada en historial
}

export interface StockAdjustment {
  productId: string;
  variantId?: string;
  quantityBefore: number;
  quantityAfter: number;
  difference: number;
  reason: string;
}

export interface DailySummary {
  date: Date;
  totalSales: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  averageTicket: number;
  topProducts: { productId: string; quantity: number; revenue: number }[];
}

export interface Expense {
  id: string;
  date: Date;
  category: 'rent' | 'utilities' | 'supplies' | 'salary' | 'other';
  amount: number;
  description: string;
  receipt?: string;
}

// ============================================
// GAMIFICATION & GOALS
// ============================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Material icon name
  category: 'sales' | 'revenue' | 'products' | 'streak' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: number; // Valor objetivo (ej: 10 ventas, S/1000 en ventas)
  progress: number; // Progreso actual
  unlocked: boolean;
  unlockedAt?: Date;
  points: number; // Puntos que otorga al desbloquearse
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  metric: 'sales_count' | 'revenue' | 'new_customers' | 'avg_ticket';
  target: number; // Meta objetivo
  current: number; // Progreso actual
  startDate: Date;
  endDate: Date;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  reward?: string; // Descripción de la recompensa
  assignedTo?: string; // ID del usuario (para multi-usuario)
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatar?: string;
  totalSales: number;
  totalRevenue: number;
  achievementsCount: number;
  points: number;
  rank: number;
  badge?: 'top_seller' | 'rising_star' | 'consistent' | 'champion';
  streak: number; // Días consecutivos con ventas
}

export interface UserStats {
  userId: string;
  totalPoints: number;
  level: number; // Nivel calculado basado en puntos
  achievementsUnlocked: string[]; // IDs de achievements
  currentStreak: number;
  longestStreak: number;
  totalSalesCompleted: number;
  totalRevenueGenerated: number;
  joinedAt: Date;
}

// ============================================
// AUTENTICACIÓN & USUARIOS
// ============================================

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'vendor';
  pin: string; // PIN de 4 dígitos
  avatar?: string;
  email?: string;
  createdAt: Date;
}

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
}
