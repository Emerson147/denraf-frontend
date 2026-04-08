import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { InventoryMovement } from '../models';
import { ErrorHandlerService } from './error-handler.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { ProductService } from './product.service';

/**
 * 🚀 InventoryMovementService - Gestión Paginada desde Spring Boot
 *
 * Estrategia:
 * 1. Single Source of Truth (PostgreSQL via REST).
 * 2. Paginación Server-Side integrada en señales.
 * 3. Actualización optimista parcial pero dependiente del status 201.
 */
@Injectable({
  providedIn: 'root',
})
export class InventoryMovementService {
  private http = inject(HttpClient);
  private errorHandler = inject(ErrorHandlerService);
  private toastService = inject(ToastService);
  private productService = inject(ProductService);

  private readonly API_URL = `${environment.apiUrl}/movimientos`;

  // --- ESTADO REACTIVO PAGINADO ---
  private movementsSignal = signal<InventoryMovement[]>([]);
  public totalElements = signal<number>(0);
  public totalPages = signal<number>(0);
  public currentPage = signal<number>(0);
  public pageSize = signal<number>(20);
  public isLoading = signal<boolean>(false);

  // Filtros Persistentes
  public currentTypeFilter = signal<string | null>(null);

  // API pública
  readonly movements = this.movementsSignal.asReadonly();

  // Computados
  entradas = computed(() => this.movementsSignal().filter((m) => m.type === 'entrada'));
  ajustes = computed(() => this.movementsSignal().filter((m) => m.type === 'ajuste'));

  /**
   * 🔄 Fetch Paginated Movements from Spring Boot (Server-Side Pagination)
   */
  async fetchPaginatedMovements(page: number = 0, size: number = this.pageSize(), type?: string): Promise<void> {
    this.isLoading.set(true);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', 'createdAt')
      .set('sortDir', 'desc');

    if (type) {
      params = params.set('type', type);
      this.currentTypeFilter.set(type);
    } else {
      this.currentTypeFilter.set(null);
    }

    try {
      const response = await firstValueFrom(this.http.get<any>(this.API_URL, { params }));
      this.movementsSignal.set(response.content || []);
      this.totalElements.set(response.totalElements || 0);
      this.totalPages.set(response.totalPages || 0);
      this.currentPage.set(response.number || 0);
      this.pageSize.set(response.size || 20);
    } catch (error) {
      this.errorHandler.handleError(error as any, 'Error cargando historial de movimientos');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * 🔄 Cambiar la cantidad de ítems a visualizar por página
   */
  async changePageSize(newSize: number): Promise<void> {
    this.pageSize.set(newSize);
    await this.fetchPaginatedMovements(0, newSize, this.currentTypeFilter() || undefined);
  }

  /**
   * 📥 Registrar entrada de inventario vía API
   */
  async registerEntrada(
    entrada: Omit<InventoryMovement, 'id' | 'movementNumber' | 'date' | 'type'>
  ): Promise<InventoryMovement | null> {
    return this.createMovement('entrada', entrada);
  }

  /**
   * 🔧 Registrar ajuste de inventario vía API
   */
  async registerAjuste(
    ajuste: Omit<InventoryMovement, 'id' | 'movementNumber' | 'date' | 'type'>
  ): Promise<InventoryMovement | null> {
    return this.createMovement('ajuste', ajuste);
  }

  /**
   * Universal POST Creator
   */
  private async createMovement(
    type: string,
    data: Omit<InventoryMovement, 'id' | 'movementNumber' | 'date' | 'type'>
  ): Promise<InventoryMovement | null> {
    try {
      this.isLoading.set(true);
      
      const payload = {
        ...data,
        type: type,
        unitCost: data.cost // Adaptar de `cost` a `unitCost` para compatibilidad backend
      };

      const result = await firstValueFrom(
        this.http.post<InventoryMovement>(this.API_URL, payload)
      );

      // Actualizar la grilla trayendo la página 0 (para ver el nuevo)
      await this.fetchPaginatedMovements(0, this.pageSize(), this.currentTypeFilter() || undefined);
      
      // Sincronizar el catálogo local de productos con la DB
      if (type === 'entrada') {
          this.productService.addStock(data.productId, data.quantity, data.variantId);
      } else if (type === 'ajuste' && data.quantity > 0) {
          this.productService.addStock(data.productId, data.quantity, data.variantId);
      } else if (type === 'ajuste' && data.quantity < 0) {
          this.productService.reduceStock(data.productId, Math.abs(data.quantity), data.variantId);
      }

      return result;
    } catch (error) {
      this.errorHandler.handleError(error as any, `Error al registrar ${type}`);
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * 🔄 Sincronización manual/recarga
   */
  async forceSync(): Promise<void> {
    await this.fetchPaginatedMovements(this.currentPage(), this.pageSize(), this.currentTypeFilter() || undefined);
  }
}
