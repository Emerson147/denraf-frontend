import {
  Component,
  computed,
  signal,
  inject,
  HostListener,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  effect,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling'; // 🚀 Virtual Scrolling
import { UiTicketComponent } from '../../../shared/ui/ui-ticket/ui-ticket.component';
import { UiSkeletonComponent } from '../../../shared/ui';
import { SalesService } from '../../../core/services/sales.service';
import { ProductService } from '../../../core/services/product.service';
import { OfflineService } from '../../../core/services/offline.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth';
import { LoggerService } from '../../../core/services/logger.service';
import { Sale, SaleItem, Product, ProductVariant } from '../../../core/models';
import { UiAnimatedDialogComponent } from '../../../shared/ui/ui-animated-dialog/ui-animated-dialog.component';
import { ImageFallbackDirective } from '../../../shared/directives/image-fallback.directive';
import { PosPaymentFacade } from '../facades/pos-payment.facade';

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: ProductVariant; // Variante seleccionada (talla + color)
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScrollingModule,
    UiTicketComponent,
    UiSkeletonComponent,
    UiAnimatedDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush, // 🚀 Optimización de Change Detection
  templateUrl: './pos-page.component.html',
  styleUrl: './pos-page.component.css',
})
export class PosPageComponent {
  // Servicios
  private salesService = inject(SalesService);
  private productService = inject(ProductService);
  private offlineService = inject(OfflineService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private logger = inject(LoggerService);
  private destroyRef = inject(DestroyRef);

  // ViewChild para enfoque automático
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // Signals
  cart = signal<CartItem[]>([]);
  searchQuery = signal('');
  selectedCategory = signal<string | null>(null);
  showTicket = signal(false);
  showClientForm = signal(false);
  showToast = signal(false);
  toastMessage = signal('');
  toastIcon = signal('check_circle');
  showMobileCart = signal(false); // 📱 Control del bottom sheet móvil

  // 🎯 Tipo de venta (auto-detectado por día)
  saleType = signal<'feria-acobamba' | 'feria-paucara' | 'tienda'>('tienda');

  // 🔄 Estado de carga conectado al ProductService
  loading = computed(() => this.productService.isLoading());

  // Constructor optimizado para carga rápida
  constructor() {
    // Enfocar input de búsqueda de forma más eficiente (sin effect)
    // Solo una vez cuando el componente esté listo
    const timeoutId = setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 200);

    // 🧹 Cleanup automático con DestroyRef
    this.destroyRef.onDestroy(() => clearTimeout(timeoutId));

    // 🎯 Auto-detectar tipo de venta basado en el día
    this.autoDetectSaleType();
  }

  // Auto-detectar tipo de venta por día de la semana
  autoDetectSaleType(): void {
    // ✅ Optimización: calculamos una sola vez
    const dayOfWeek = new Date().getDay();

    if (dayOfWeek === 4) {
      this.saleType.set('feria-acobamba');
      this.logger.log('🎯 Tipo de venta: Feria Acobamba (Jueves)');
    } else if (dayOfWeek === 0) {
      this.saleType.set('feria-paucara');
      this.logger.log('🎯 Tipo de venta: Feria Paucara (Domingo)');
    } else {
      this.saleType.set('tienda');
      this.logger.log('🎯 Tipo de venta: Tienda Paucara');
    }
  }

  // 🔥 ATAJOS DE TECLADO PROFESIONALES
  @HostListener('window:keydown.f2', ['$event'])
  onF2Key(event: Event) {
    event.preventDefault();
    this.searchInput?.nativeElement?.focus();
    this.searchInput?.nativeElement?.select();
  }

  @HostListener('window:keydown.f3', ['$event'])
  onF3Key(event: Event) {
    event.preventDefault();
    if (this.cart().length > 0) {
      this.clearCart();
    }
  }

  @HostListener('window:keydown.f4', ['$event'])
  onF4Key(event: Event) {
    event.preventDefault();
    if (this.cart().length > 0) {
      this.showClientForm.update((v) => !v);
    }
  }

  @HostListener('window:keydown.enter', ['$event'])
  onEnterKey(event: Event) {
    const target = event.target as HTMLElement;
    // Solo procesar Enter si no estamos en un input/textarea
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      if (this.cart().length > 0 && !this.showTicket()) {
        event.preventDefault();
        this.checkout();
      }
    }
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(event: Event) {
    event.preventDefault();
    if (this.variantSelectorOpen()) {
      this.variantSelectorOpen.set(false);
    } else if (this.showTicket()) {
      this.showTicket.set(false);
    } else {
      this.clearFilters();
    }
  }

  // Datos del ticket
  currentTicketNumber = 4031;
  clientName = 'Cliente';
  clientPhone = '';
  paymentMethod = '';
  amountPaid = 0;
  discount = 0; // Descuento aplicado
  currentSale: Sale | null = null; // Venta actual para el ticket

  // Selector de variantes
  variantSelectorOpen = signal(false);
  selectedProductForVariant = signal<Product | null>(null);
  selectedVariant = signal<ProductVariant | null>(null);

  // ✅ PRODUCTOS SINCRONIZADOS DESDE EL SERVICIO CENTRAL
  products = this.productService.products;

  // Computed
  categories = computed(() => {
    const cats = new Set(this.products().map((p) => p.category));
    return Array.from(cats);
  });

  // 📊 ESTADÍSTICAS DIARIAS
  todaySales = computed(() => {
    const today = new Date().toDateString();
    return this.salesService.sales().filter((s) => new Date(s.date).toDateString() === today);
  });

  dailyRevenue = computed(() => {
    return this.todaySales().reduce((sum, s) => sum + s.total, 0);
  });

  dailyProductsSold = computed(() => {
    return this.todaySales().reduce(
      (sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
  });

  averageTicket = computed(() => {
    const sales = this.todaySales().length;
    return sales > 0 ? this.dailyRevenue() / sales : 0;
  });

  // 🎯 PRODUCTOS FRECUENTES (Top 6 más vendidos)
  topProducts = computed(() => {
    const productSales = new Map<string, number>();

    this.salesService.sales().forEach((sale) => {
      sale.items.forEach((item) => {
        const current = productSales.get(item.productId) || 0;
        productSales.set(item.productId, current + item.quantity);
      });
    });

    return this.products()
      .map((p) => ({
        product: p,
        sold: productSales.get(p.id) || 0,
      }))
      .filter((p) => p.sold > 0 && p.product.stock > 0)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 6)
      .map((p) => p.product);
  });

  // 🔄 ESTADO DE CONEXIÓN
  isOnline = computed(() => this.offlineService.isOnline());
  pendingSalesCount = computed(() => {
    const pending = (this.offlineService as any).pendingSales?.() || [];
    return Array.isArray(pending) ? pending.length : 0;
  });

  // Optimizado: Memoización eficiente de productos filtrados
  filteredProducts = computed(() => {
    let filtered = this.products();

    // Filtrar por categoría
    if (this.selectedCategory()) {
      filtered = filtered.filter((p) => p.category === this.selectedCategory());
    }

    // Filtrar por búsqueda (nombre, categoría, marca, o código de barras)
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.brand?.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query) || // Búsqueda por ID
          p.variants?.some((v) => v.barcode?.toLowerCase().includes(query)) // Búsqueda por código de barras
      );
    }

    // 🚀 OPTIMIZACIÓN: Limitar a 50 productos en vista inicial para renderizado rápido
    // Si hay búsqueda o filtro, mostrar todos los resultados
    const hasFilters = this.searchQuery() || this.selectedCategory();
    return hasFilters ? filtered : filtered.slice(0, 50);
  });

  // 🔥 BÚSQUEDA INTELIGENTE CON CÓDIGO DE BARRAS
  onSearchChange(event: Event) {
    const query = this.searchQuery();

    // Si la búsqueda tiene formato de código de barras (números puros de 8+ dígitos)
    if (/^\d{8,}$/.test(query)) {
      // Buscar por código de barras exacto
      const productByBarcode = this.products().find((p) =>
        p.variants?.some((v) => v.barcode === query)
      );

      if (productByBarcode) {
        const variant = productByBarcode.variants?.find((v) => v.barcode === query);
        if (variant) {
          // Agregar automáticamente al carrito
          this.addToCartWithVariant(productByBarcode, variant);
          this.searchQuery.set(''); // Limpiar búsqueda
          this.toastService.success(
            `${productByBarcode.name} - ${variant.size} ${variant.color} agregado`
          );
          return;
        }
      }
    }
  }

  // El precio del producto YA incluye IGV (18%)
  // Total = suma de (precio × cantidad) - este es el precio final con IGV incluido
  total = computed(() => {
    return this.cart().reduce((sum, item) => {
      return sum + item.product.price * item.quantity;
    }, 0);
  });

  // Subtotal = precio sin IGV (base imponible)
  subtotal = computed(() => this.total() / 1.18);

  // IGV = 18% calculado sobre el subtotal
  tax = computed(() => this.subtotal() * 0.18);

  // Métodos del carrito
  addToCart(product: Product) {
    if (product.stock === 0) {
      this.toastService.error('Producto sin stock');
      return;
    }

    // Si el producto tiene variantes, abrir selector
    if (product.variants && product.variants.length > 0) {
      this.selectedProductForVariant.set(product);
      this.selectedVariant.set(product.variants[0]); // Pre-seleccionar la primera
      this.variantSelectorOpen.set(true);
      return;
    }

    // Si no tiene variantes, agregar directamente
    this.addToCartWithVariant(product, undefined);
  }

  addToCartWithVariant(product: Product, variant?: ProductVariant) {
    // Verificar stock de la variante específica si existe
    if (variant && variant.stock === 0) {
      this.toastService.error('Variante sin stock');
      return;
    }

    // Buscar si ya existe esta combinación exacta en el carrito
    const existingItem = this.cart().find(
      (item) => item.product.id === product.id && item.variant?.id === variant?.id
    );

    if (existingItem) {
      const maxStock = variant ? variant.stock : product.stock;
      if (existingItem.quantity >= maxStock) {
        this.toastService.warning('Stock máximo alcanzado');
        return;
      }
      this.updateQuantity(product.id, variant?.id, 1);
    } else {
      this.cart.update((cart) => [...cart, { product, quantity: 1, variant }]);
      const variantLabel = variant ? ` (${variant.size} - ${variant.color})` : '';
      this.toastService.success(`Producto agregado${variantLabel}`);
    }

    // Cerrar el selector
    this.variantSelectorOpen.set(false);
  }

  selectVariant(variant: ProductVariant) {
    this.selectedVariant.set(variant);
  }

  confirmVariantSelection() {
    const product = this.selectedProductForVariant();
    const variant = this.selectedVariant();

    if (product && variant) {
      this.addToCartWithVariant(product, variant);
    }
  }

  updateQuantity(productId: string, variantId: string | undefined, change: number) {
    this.cart.update((cart) => {
      return cart.map((item) => {
        // Verificar si es el item correcto (producto + variante)
        const isMatch =
          item.product.id === productId &&
          ((!variantId && !item.variant) || item.variant?.id === variantId);

        if (!isMatch) return item;

        const newQuantity = item.quantity + change;

        if (newQuantity <= 0) {
          return item;
        }

        // Verificar stock según si tiene variante o no
        const maxStock = item.variant ? item.variant.stock : item.product.stock;
        if (newQuantity > maxStock) {
          this.toastService.warning('Stock insuficiente');
          return item;
        }

        return { ...item, quantity: newQuantity };
      });
    });
  }

  removeFromCart(productId: string, variantId?: string) {
    this.cart.update((cart) =>
      cart.filter((item) => {
        // Si el producto no coincide, mantenerlo
        if (item.product.id !== productId) return true;

        // Si ambos tienen variante, deben coincidir para eliminar
        if (variantId && item.variant?.id) {
          return item.variant.id !== variantId;
        }

        // Si ambos NO tienen variante, eliminar
        if (!variantId && !item.variant) {
          return false;
        }

        // En cualquier otro caso, mantener
        return true;
      })
    );
    this.toastService.info('Producto eliminado');
  }

  clearCart() {
    if (confirm('¿Estás seguro de vaciar el carrito?')) {
      this.cart.set([]);
      this.toastService.info('Carrito vaciado');
    }
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedCategory.set(null);
  }

  // 💳 PAGO RÁPIDO (un solo click)
  quickPayment(method: 'cash' | 'yape' | 'card') {
    if (this.cart().length === 0) return;

    this.paymentMethod = method === 'cash' ? 'Efectivo' : method === 'yape' ? 'Yape' : 'Tarjeta';
    this.checkout();
  }

  // Checkout
  checkout() {
    if (this.cart().length === 0) return;

    this.showTicket.set(true);
  }

  onTicketClosed() {
    // Crear y registrar la venta en el sistema
    this.completeSale();

    // Limpiar estado
    this.showTicket.set(false);
    this.cart.set([]);
    this.clientName = 'Cliente';
    this.clientPhone = '';
    this.paymentMethod = '';
    this.amountPaid = 0;
    this.discount = 0;
    this.showClientForm.set(false);
    this.currentTicketNumber++;

    // 🎯 Auto-detectar tipo de venta para la próxima
    this.autoDetectSaleType();
  }

  completeSale() {
    if (this.cart().length === 0) return;

    // Validar método de pago
    if (!this.paymentMethod) {
      this.toastService.warning('Selecciona un método de pago');
      return;
    }

    // Convertir items del carrito a SaleItems
    const saleItems: SaleItem[] = this.cart().map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      size: item.variant?.size || item.product.sizes[0] || 'M',
      color: item.variant?.color || item.product.colors?.[0],
      unitPrice: item.product.price,
      subtotal: item.product.price * item.quantity,
      variantId: item.variant?.id, // Incluir ID de variante si existe
    }));

    // Calcular totales
    const subtotal = this.subtotal();
    const tax = this.tax();
    const total = this.total();

    const saleData = {
      items: saleItems,
      subtotal: subtotal,
      discount: this.discount,
      tax: tax,
      total: total - this.discount,
      paymentMethod: this.getPaymentMethodType(),
      status: 'completed' as const,
      saleType: this.saleType(), // 🎯 Tipo de venta registrado
      customer:
        this.clientName !== 'Cliente'
          ? {
              id: `CLI-${Date.now()}`,
              name: this.clientName,
              phone: this.clientPhone || undefined,
              totalPurchases: total,
              tier: 'nuevo' as const,
            }
          : undefined,
      notes:
        this.amountPaid > 0
          ? `Pagó: S/ ${this.amountPaid}, Cambio: S/ ${this.amountPaid - total}`
          : undefined,
      createdBy: this.authService.currentUser()?.name || 'Usuario POS',
      vendedorId: this.authService.currentUser()?.id || 'user-1',
    };

    // 🔌 DETECCIÓN AUTOMÁTICA: Online vs Offline

    if (this.offlineService.isOnline()) {
      // ✅ MODO ONLINE: Guardar normalmente
      const sale = this.salesService.createSale(saleData);
      if (sale) {
        this.toastService.success(`Venta ${sale.saleNumber} registrada correctamente`);
        this.logger.log('✅ Venta registrada (ONLINE):', sale);
      }
    } else {
      // 📴 MODO OFFLINE: Guardar en IndexedDB
      this.offlineService.saveSaleOffline(saleData);
      this.toastService.warning('Venta guardada offline. Se sincronizará cuando vuelva internet');
      this.logger.log('📴 Venta guardada (OFFLINE):', saleData);
    }

    // ✅ El stock se reduce automáticamente en SalesService.createSale()
  }

  getPaymentMethodType(): Sale['paymentMethod'] {
    const method = this.paymentMethod.toLowerCase();
    if (method.includes('efectivo')) return 'cash';
    if (method.includes('tarjeta')) return 'card';
    if (method.includes('yape')) return 'yape';
    if (method.includes('plin')) return 'plin';
    if (method.includes('transfer')) return 'transfer';
    return 'cash';
  }

  onTicketPrinted() {
    this.logger.log('Ticket impreso');
    this.toastService.info('Imprimiendo ticket...');
  }

  onTicketSent() {
    if (!this.clientPhone) {
      this.toastService.warning('Ingresa el teléfono del cliente');
      return;
    }
    this.logger.log('Ticket enviado por WhatsApp');
    this.toastService.success('Ticket enviado por WhatsApp');
  }

  // Toast notifications
  toast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') {
    const icons = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };

    this.toastMessage.set(message);
    this.toastIcon.set(icons[type]);
    this.showToast.set(true);

    setTimeout(() => {
      this.showToast.set(false);
    }, 3000);
  }

  // 🚀 FUNCIONES TRACKBY PARA OPTIMIZACIÓN DE PERFORMANCE
  trackByProductId(_index: number, product: Product): string {
    return product.id;
  }

  trackByCartItemId(_index: number, item: CartItem): string {
    return item.product.id + (item.variant?.size || '') + (item.variant?.color || '');
  }

  trackByCategory(_index: number, category: string): string {
    return category;
  }
}
