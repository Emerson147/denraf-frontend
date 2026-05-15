import { Injectable, signal, computed, inject } from '@angular/core';
import { Sale, SaleItem, Customer, VentaRequest, VentaResponse } from '../models';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';
import { ToastService } from './toast.service';
import { ProductService } from './product.service';
import { ErrorHandlerService } from './error-handler.service';
import { ClientService } from './client.service';
import { GamificationService } from './gamification.service';

/**
 * 🚀 SalesService - Spring Boot Paginated Architecture
 */
@Injectable({
  providedIn: 'root',
})
export class SalesService {
  private notificationService = inject(NotificationService);
  private toastService = inject(ToastService);
  private productService = inject(ProductService);
  private errorHandler = inject(ErrorHandlerService);
  private clientService = inject(ClientService);
  private gamificationService = inject(GamificationService);
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ventas`;

  // Estado de ventas
  private salesSignal = signal<Sale[]>([]);

  // 🔄 Estado de carga y paginación
  isLoading = signal(true);
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);
  totalPages = signal(0);
  currentFilters = signal<any>({});
  totalFilteredRevenue = signal(0);
  validElements = signal(0);

  // 🎯 Control de inicialización única
  private initialized = false;

  // Exponemos como readonly
  readonly sales = this.salesSignal.asReadonly();
  readonly allSales = this.sales; // Alias para compatibilidad

  constructor() {
    // Inicialización optimizada
    if (!this.initialized) {
      this.initialized = true;
      this.fetchPaginatedSales(0, 100); // Precargar últimos 100
    }
  }

  /**
   * 📡 OBTENER VENTAS PAGINADAS DESDE SPRING BOOT (NUEVO)
   * Extrae la información directamente desde PostgreSQL.
   */
  private fullFilteredSales: any[] | null = null;

  async fetchPaginatedSales(page: number = 0, size: number = 10, filters?: any): Promise<void> {
    this.isLoading.set(true);
    
    // Use explicitly passed filters, or fallback to stored filters
    const activeFilters = filters !== undefined ? filters : this.currentFilters();
    const filtersChanged = JSON.stringify(activeFilters) !== JSON.stringify(this.currentFilters());
    
    if (filters !== undefined) {
      this.currentFilters.set(filters);
    }

    // If filters changed, or we don't have the full data, fetch ALL items for the period
    if (filtersChanged || this.fullFilteredSales === null) {
      // Pedimos un gran numero de registros para tener el total real
      let url = `${this.apiUrl}?page=0&size=10000&sortBy=createdAt&sortDir=desc`;
      
      if (activeFilters?.status) url += `&status=${activeFilters.status}`;
      if (activeFilters?.desde) url += `&desde=${activeFilters.desde}`;
      if (activeFilters?.hasta) url += `&hasta=${activeFilters.hasta}`;

      try {
        console.log('📡 [Sales] Fetching ALL from Spring Boot for filters:', url);
        const res: any = await firstValueFrom(this.http.get(url));
        const isArray = Array.isArray(res);
        this.fullFilteredSales = isArray ? res : (res.content || []);
        
        // 🔄 Forzar ordenamiento local descendente (Más recientes primero)
        // Por si el backend ignora el sortDir=desc
        this.fullFilteredSales?.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

      } catch (err) {
        console.error('❌ [Sales] Error fetching sales from backend:', err);
        this.fullFilteredSales = [];
      }
    }

    const allContent = this.fullFilteredSales || [];
    const totalItems = allContent.length;
    const totalPagesCount = Math.ceil(totalItems / size) || 1;
    
    // Excluir ventas anuladas para el cálculo de ingresos y volumen
    const validContent = allContent.filter((raw: any) => raw.status !== 'cancelled' && raw.status !== 'anulada');
    const validItemsCount = validContent.length;
    const totalRevenue = validContent.reduce((sum: number, raw: any) => sum + (raw.total ?? 0), 0);
    
    // Local pagination
    const pagedContent = allContent.slice(page * size, (page + 1) * size);

    // Mapear los items al formato "Sale" que usaba Frontend
    const mappedSales: Sale[] = pagedContent.map((raw: any) => {
        const totalFinal = raw.total ?? 0;
        const baseImponible = totalFinal / 1.18;
        const igv = totalFinal - baseImponible;

      return {
        id: raw.id,
        saleNumber: raw.saleNumber,
        date: raw.createdAt || new Date().toISOString(),
        total: totalFinal,
        subtotal: baseImponible,
        discount: raw.discount ?? 0,
        tax: igv,
        paymentMethod: raw.paymentMethod || 'Efectivo',
        items: (raw.items || []).map((i: any) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice ?? 0,
          subtotal: i.subtotal ?? 0,
          size: i.size,
          color: i.color
        })),
        customerId: raw.customerId,
        customer: (raw.customerId ? this.clientService.getClientById(raw.customerId) || { name: 'Cliente Registrado', phone: '' } : undefined) as any,
        vendedorId: raw.vendedorId,
        createdBy: raw.createdBy || 'Sistema',
        status: raw.status || 'completed',
        saleType: raw.saleType || 'tienda',
        notes: raw.notes || ''
      };
    });

    this.salesSignal.set(mappedSales);
    this.currentPage.set(page);
    this.totalElements.set(totalItems);
    this.validElements.set(validItemsCount);
    this.totalFilteredRevenue.set(totalRevenue);
    this.totalPages.set(totalPagesCount);

    this.isLoading.set(false);
  }

  /**
   * 🔄 Forzar recarga completa
   */
  async forceSync(): Promise<void> {
    await this.fetchPaginatedSales(this.currentPage(), this.pageSize());
  }

  /**
   * 🔄 Cambiar la cantidad de ítems a visualizar por página
   */
  async changePageSize(newSize: number): Promise<void> {
    this.pageSize.set(newSize);
    // Vuelve a la página 0 cuando se redimensiona
    await this.fetchPaginatedSales(0, newSize);
  }

  // Obtener resumen / aliases rápidos que el Dashboard utiliza
  todaySales = computed(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return this.salesSignal().filter(s => new Date(s.date) >= startOfToday);
  });
  
  weeklySales = computed(() => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0,0,0,0);
    return this.salesSignal().filter(s => new Date(s.date) >= startOfWeek);
  });

  monthlySales = computed(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    return this.salesSignal().filter(s => new Date(s.date) >= startOfMonth);
  });

  todayRevenue = computed(() => this.todaySales().reduce((sum, s) => sum + s.total, 0));
  weeklyRevenue = computed(() => this.weeklySales().reduce((sum, s) => sum + s.total, 0));
  monthlyRevenue = computed(() => this.monthlySales().reduce((sum, s) => sum + s.total, 0));

  topProducts = computed(() => {
    const itemMap = new Map<string, { name: string, quantity: number, revenue: number }>();
    this.salesSignal().forEach(sale => {
      sale.items.forEach(item => {
        const id = item.productId;
        const existing = itemMap.get(id) || { name: item.productName, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.subtotal;
        itemMap.set(id, existing);
      });
    });
    return Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity);
  });

  async createVenta(request: VentaRequest): Promise<VentaResponse> {
    this.isLoading.set(true);
    try {
      const rawResponse = await firstValueFrom(
        this.http.post<VentaResponse>(this.apiUrl, request)
      );

      // 🔄 Refrescar inventario directamente desde el backend para tener la verdad absoluta
      // Esto evita hacer un PUT manual del producto que corrompía las variantes
      this.productService.forceSync().catch(err => console.error('Error auto-sync tras venta:', err));
      
      this.checkAndNotify({
        ...rawResponse,
        date: rawResponse.createdAt,
        saleType: 'tienda'
      } as any);
      
      // 🔄 Refrescar historial de ventas para UI en tiempo real
      this.forceSync().catch(err => console.error('Error auto-sync ventas:', err));

      // 🌟 Reflejar los puntos en metas y goals en tiempo real
      this.gamificationService.loadData();

      return rawResponse;
    } catch (error) {
      console.error('Error registrando venta HTTP en backend:', error);
      this.toastService.error('Error registrando venta HTTP en backend');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  getSaleById(id: string): Sale | undefined {
    return this.salesSignal().find((s) => s.id === id);
  }

  // 📦 Legacy Adapter para POS (Síncrono/Optimista)
  createSale(saleData: Omit<Sale, 'id' | 'saleNumber' | 'date'>): Sale {
    const newSale: Sale = {
      ...saleData,
      id: crypto.randomUUID(),
      saleNumber: this.generateSaleNumber(),
      date: new Date()
    };
    
    // UI Local Optimista
    this.salesSignal.update(s => [newSale, ...s]);
    
    // Sync Real en Background
    const req: VentaRequest = {
        items: newSale.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod: newSale.paymentMethod,
        discount: newSale.discount,
        tax: newSale.tax,
        createdBy: newSale.createdBy,
        vendedorId: newSale.vendedorId,
        customerId: newSale.customer?.id && newSale.customer.id.length === 36 ? newSale.customer.id : undefined
    };
    // No esperamos la respuesta para no bloquear el POS UI
    this.createVenta(req).catch(err => console.error('Error auto-sync createVenta:', err));

    return newSale;
  }

  // ❌ Cancelar/Anular venta en Backend
  cancelSale(id: string, reason: string, restoreStock: boolean): boolean {
    const sale = this.salesSignal().find((s) => s.id === id);
    if (!sale) {
      this.toastService.error('Venta no encontrada');
      return false;
    }

    try {
      // Optimizacion en UI
      this.salesSignal.update((sales) =>
        sales.map((s) => (s.id === id ? { ...s, status: 'cancelled' } : s))
      );
      
      // Enviar peticion al server real
      this.http.post(`${this.apiUrl}/${id}/cancelar`, {}).subscribe({
        next: () => {
          this.toastService.success(`Venta ${sale.saleNumber} anulada`, 3000);
          // Restaurar Stock UI optimistamente si el backend asume que lo restauró.
          if (restoreStock) {
            sale.items.forEach((item) => {
               const product = this.productService.getProductById(item.productId);
               if (product) this.productService.updateStock(product.id, item.quantity, undefined as any);
            });
          }
          this.forceSync(); 
        },
        error: (err) => {
          console.error(err);
          this.toastService.error('Hubo un error anulando la venta desde el servidor');
        }
      });
      
      return true;
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'Anular Venta');
      return false;
    }
  }

  // Exportar ventas a JSON
  exportToJSON(): string {
    return JSON.stringify(this.salesSignal(), null, 2);
  }

  // Generar número de venta temporal
  private generateSaleNumber(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.getTime().toString().slice(-6);
    return `V-${date}-${time}`;
  }

  // 🔔 Sistema de notificaciones automáticas
  private checkAndNotify(sale: Sale) {
    if (sale.status === 'completed') {
      this.toastService.success(
        `Venta completada por S/${sale.total.toLocaleString()}`,
        3000
      );
      // Persistent notification (direct, no engine to avoid circular dep)
      this.notificationService.success(
        'Venta completada',
        `${sale.saleNumber || 'Venta'} — S/ ${sale.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
        { category: 'sales', actionLabel: 'Ver detalle', actionRoute: '/sales' }
      );
    }
  }
}
