import { Injectable, signal, inject, computed } from '@angular/core';
import { SalesService } from '../../../core/services/sales.service';
import { OfflineService } from '../../../core/services/offline.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth';
import { LoggerService } from '../../../core/services/logger.service';
import { Sale, SaleItem, Customer } from '../../../core/models';
import { CartItem } from './pos-cart.facade';

/**
 * 💳 POS Payment Facade
 * 
 * Facade reutilizable para gestión de pagos y checkout en POS.
 * 
 * @example
 * ```typescript
 * private paymentFacade = inject(PosPaymentFacade);
 * 
 * // Procesar pago
 * const sale = this.paymentFacade.processPayment(cartItems, 'cash', customerData);
 * 
 * // Verificar estado offline
 * const isOffline = this.paymentFacade.isOffline();
 * ```
 */

export interface CustomerData {
  name?: string;
  phone?: string;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'yape' | 'plin';

@Injectable()
export class PosPaymentFacade {
  private salesService = inject(SalesService);
  private offlineService = inject(OfflineService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private logger = inject(LoggerService);
  
  // Estado del pago
  private paymentMethodSignal = signal<PaymentMethod | null>(null);
  private customerDataSignal = signal<CustomerData>({ name: 'Cliente' });
  private discountSignal = signal<number>(0);
  private showTicketSignal = signal<boolean>(false);
  private currentTicketNumberSignal = signal<number>(4031);
  private saleTypeSignal = signal<'feria-acobamba' | 'feria-paucara' | 'tienda'>('tienda');
  
  // Exposición readonly
  readonly paymentMethod = this.paymentMethodSignal.asReadonly();
  readonly customerData = this.customerDataSignal.asReadonly();
  readonly discount = this.discountSignal.asReadonly();
  readonly showTicket = this.showTicketSignal.asReadonly();
  readonly currentTicketNumber = this.currentTicketNumberSignal.asReadonly();
  readonly saleType = this.saleTypeSignal.asReadonly();
  
  // Estado de conexión
  readonly isOnline = this.offlineService.isOnline;
  readonly pendingSalesCount = computed(() => {
    const pending = (this.offlineService as any).pendingSales?.() || [];
    return Array.isArray(pending) ? pending.length : 0;
  });

  /**
   * Establecer método de pago
   * @param method Método de pago seleccionado
   */
  setPaymentMethod(method: PaymentMethod): void {
    this.paymentMethodSignal.set(method);
  }

  /**
   * Establecer datos del cliente
   * @param data Datos del cliente
   */
  setCustomerData(data: CustomerData): void {
    this.customerDataSignal.update(current => ({ ...current, ...data }));
  }

  /**
   * Limpiar datos del cliente
   */
  clearCustomerData(): void {
    this.customerDataSignal.set({ name: 'Cliente' });
  }

  /**
   * Establecer descuento
   * @param discount Monto del descuento
   */
  setDiscount(discount: number): void {
    this.discountSignal.set(Math.max(0, discount));
  }

  /**
   * Establecer tipo de venta
   * @param type Tipo de venta (feria-acobamba, feria-paucara, tienda)
   */
  setSaleType(type: 'feria-acobamba' | 'feria-paucara' | 'tienda'): void {
    this.saleTypeSignal.set(type);
  }

  /**
   * Auto-detectar tipo de venta basado en el día actual
   * Jueves (4) → Feria Acobamba
   * Domingo (0) → Feria Paucara
   * Otros días → Tienda
   */
  autoDetectSaleType(): void {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    if (dayOfWeek === 4) {
      this.saleTypeSignal.set('feria-acobamba');
    } else if (dayOfWeek === 0) {
      this.saleTypeSignal.set('feria-paucara');
    } else {
      this.saleTypeSignal.set('tienda');
    }
  }

  /**
   * Calcular totales
   * @param cartItems Items del carrito
   */
  calculateTotals(cartItems: CartItem[]) {
    const subtotal = cartItems.reduce((sum, item) => 
      sum + (item.product.price * item.quantity), 0
    );
    
    const discount = this.discountSignal();
    const tax = (subtotal - discount) * 0.18;
    const total = subtotal - discount + tax;
    
    return {
      subtotal,
      discount,
      tax,
      total
    };
  }

  /**
   * Procesar pago y crear venta
   * @param cartItems Items del carrito
   * @param method Método de pago
   * @param customer Datos del cliente (opcional)
   * @returns Venta creada o null si falla
   */
  processPayment(
    cartItems: CartItem[],
    method?: PaymentMethod,
    customer?: CustomerData
  ): Sale | null {
    // Validaciones
    if (cartItems.length === 0) {
      this.toastService.error('El carrito está vacío');
      return null;
    }

    const paymentMethod = method || this.paymentMethodSignal();
    if (!paymentMethod) {
      this.toastService.warning('Selecciona un método de pago');
      return null;
    }

    // Actualizar datos del cliente si se proporcionaron
    if (customer) {
      this.setCustomerData(customer);
    }

    // Convertir items del carrito a SaleItems
    const saleItems: SaleItem[] = cartItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      size: item.variant?.size || item.product.sizes[0] || 'M',
      color: item.variant?.color,
      unitPrice: item.product.price,
      subtotal: item.product.price * item.quantity
    }));

    // Calcular totales
    const { subtotal, discount, tax, total } = this.calculateTotals(cartItems);

    // Preparar datos de la venta
    const customerData = this.customerDataSignal();
    const saleData: Omit<Sale, 'id' | 'saleNumber' | 'date'> = {
      items: saleItems,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      status: 'completed',
      saleType: this.saleTypeSignal(), // 🎯 Tipo de venta registrado
      customer: customerData.name !== 'Cliente' ? {
        id: `CLI-${Date.now()}`,
        name: customerData.name || 'Cliente',
        phone: customerData.phone,
        totalPurchases: total,
        tier: 'nuevo'
      } : undefined,
      createdBy: this.authService.currentUser()?.name || 'Sistema',
      vendedorId: this.authService.currentUser()?.id || 'admin'
    };

    // Crear venta (online u offline)
    let sale: Sale | null = null;
    
    if (this.offlineService.isOnline()) {
      // Modo online
      sale = this.salesService.createSale(saleData);
      if (sale) {
        this.logger.log('✅ Venta registrada (ONLINE):', sale);
        this.toastService.success(`Venta ${sale.saleNumber} registrada`);
      }
    } else {
      // Modo offline
      this.offlineService.saveSaleOffline(saleData);
      this.logger.log('📴 Venta guardada (OFFLINE):', saleData);
      this.toastService.warning('Venta guardada offline. Se sincronizará cuando vuelva internet');
      
      // Crear objeto Sale temporal para el ticket
      sale = {
        ...saleData,
        id: `TEMP-${Date.now()}`,
        saleNumber: `VENTA-${this.currentTicketNumberSignal()}`,
        date: new Date()
      };
    }

    // Incrementar número de ticket
    this.incrementTicketNumber();

    return sale;
  }

  /**
   * Mostrar ticket
   */
  displayTicket(): void {
    this.showTicketSignal.set(true);
  }

  /**
   * Ocultar ticket
   */
  hideTicket(): void {
    this.showTicketSignal.set(false);
  }

  /**
   * Resetear estado del pago y auto-detectar tipo de venta
   */
  reset(): void {
    this.paymentMethodSignal.set(null);
    this.clearCustomerData();
    this.discountSignal.set(0);
    this.showTicketSignal.set(false);
    this.autoDetectSaleType(); // 🎯 Auto-detectar tipo para próxima venta
  }

  /**
   * Incrementar número de ticket
   */
  private incrementTicketNumber(): void {
    this.currentTicketNumberSignal.update(n => n + 1);
  }

  /**
   * Obtener método de pago como tipo Sale
   */
  getPaymentMethodType(method?: string): Sale['paymentMethod'] {
    const m = (method || this.paymentMethodSignal() || 'cash').toLowerCase();
    if (m.includes('efectivo') || m === 'cash') return 'cash';
    if (m.includes('tarjeta') || m === 'card') return 'card';
    if (m.includes('yape') || m === 'yape') return 'yape';
    if (m.includes('plin') || m === 'plin') return 'plin';
    if (m.includes('transfer') || m === 'transfer') return 'transfer';
    return 'cash';
  }
}
