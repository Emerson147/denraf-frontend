import { Injectable, signal, computed, inject } from '@angular/core';
import { Sale, SaleItem, Customer, VentaRequest, VentaResponse } from '../models';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';
import { ToastService } from './toast.service';
import { ProductService } from './product.service';
import { ErrorHandlerService } from './error-handler.service';
import { LocalDbService } from './local-db.service';
import { ClientService } from './client.service';

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
  private localDb = inject(LocalDbService);
  private clientService = inject(ClientService);
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
  async fetchPaginatedSales(page: number = 0, size: number = 10, filters?: any): Promise<void> {
    this.isLoading.set(true);
    let url = `${this.apiUrl}?page=${page}&size=${size}&sortBy=createdAt&sortDir=desc`;
    
    if (filters?.status) url += `&status=${filters.status}`;
    if (filters?.desde) url += `&desde=${filters.desde}`;
    if (filters?.hasta) url += `&hasta=${filters.hasta}`;

    try {
      console.log('📡 [Sales] Fetching de Spring Boot:', url);
      const res: any = await firstValueFrom(this.http.get(url));
      
      const content = res.content || res;
      
      // Mapear los items al formato "Sale" que usaba Frontend
      const mappedSales: Sale[] = content.map((raw: any) => {
        return {
          id: raw.id,
          saleNumber: raw.saleNumber,
          date: raw.createdAt || new Date().toISOString(),
          total: raw.total ?? 0,
          subtotal: raw.subtotal ?? 0,
          discount: raw.discount ?? 0,
          tax: raw.tax ?? 0,
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
          customer: raw.customerId ? this.clientService.getClientById(raw.customerId) || { name: 'Cliente Registrado', phone: '' } : undefined,
          vendedorId: raw.vendedorId,
          status: raw.status || 'completed',
          saleType: raw.saleType || 'tienda',
          notes: raw.notes || ''
        };
      });

      this.salesSignal.set(mappedSales);
      this.currentPage.set(res.number || 0);
      this.totalElements.set(res.totalElements || mappedSales.length);
      this.totalPages.set(res.totalPages || 1);

      this.isLoading.set(false);
    } catch(err) {
      console.error('❌ [Sales] Error fetching sales from backend:', err);
      this.isLoading.set(false);
    }
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

      // Descontar inventario optimista en Frontend
      const failedItems: string[] = [];
      request.items.forEach((item) => {
        const success = this.productService.reduceStock(
          item.productId,
          item.quantity,
          item.varianteId
        );
        if (!success) {
          failedItems.push(item.productId);
        }
      });
      
      this.checkAndNotify({
        ...rawResponse,
        date: rawResponse.createdAt,
        saleType: 'tienda'
      } as any);

      // Resincronizar de fondo para asegurar precisión exacta con el backend
      this.productService.forceSync().catch(err => console.error('Error auto-sync tras venta:', err));

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
        customerId: newSale.customer?.id
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

  // 🔔 Sistema de notificaciones automáticas (Simplificado)
  private checkAndNotify(sale: Sale) {
    if (sale.status === 'completed') {
      this.toastService.success(
        `Venta completada por $${sale.total.toLocaleString()}`,
        3000
      );
    }
  }
}
