import { Injectable, signal, computed, inject } from '@angular/core';
import { InventoryMovement } from '../models';
import { ProductService } from './product.service';
import { AuthService } from '../auth/auth';
import { SyncService } from './sync.service';
import { LocalDbService } from './local-db.service';
import { ErrorHandlerService } from './error-handler.service';

/**
 * 🚀 InventoryMovementService - Gestión de movimientos de inventario
 *
 * Estrategia:
 * 1. Registra entradas, salidas, ajustes y devoluciones
 * 2. Actualiza stock automáticamente
 * 3. Sincroniza con Supabase
 * 4. Cache en IndexedDB
 */
@Injectable({
  providedIn: 'root',
})
export class InventoryMovementService {
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  private syncService = inject(SyncService);
  private localDb = inject(LocalDbService);
  private errorHandler = inject(ErrorHandlerService);

  // State
  private movementsSignal = signal<InventoryMovement[]>([]);

  // 🔄 Estado de carga
  isLoading = signal(true);
  private initialized = false;
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
  lastSyncTime = signal<Date | null>(null);

  // API pública
  readonly movements = this.movementsSignal.asReadonly();

  // Computed
  entradas = computed(() => this.movementsSignal().filter((m) => m.type === 'entrada'));

  salidas = computed(() => this.movementsSignal().filter((m) => m.type === 'salida'));

  ajustes = computed(() => this.movementsSignal().filter((m) => m.type === 'ajuste'));

  devoluciones = computed(() => this.movementsSignal().filter((m) => m.type === 'devolucion'));

  // 📏 Cache de fecha actual para evitar recalcular new Date() en cada computed
  private currentDateCache = computed(() => {
    // Trigger implícito para actualizar cuando cambien movimientos
    this.movementsSignal();
    return new Date().toDateString();
  });

  // Movimientos de hoy (optimizado con cache)
  todayMovements = computed(() => {
    const today = this.currentDateCache();
    return this.movementsSignal().filter((m) => new Date(m.date).toDateString() === today);
  });

  // 💰 Inversión total en compras (entradas)
  totalInvestment = computed(() => {
    return this.entradas().reduce((sum, entrada) => {
      return sum + (entrada.totalCost || 0);
    }, 0);
  });

  // 💸 Inversión del día
  todayInvestment = computed(() => {
    return this.todayMovements()
      .filter((m) => m.type === 'entrada')
      .reduce((sum, entrada) => sum + (entrada.totalCost || 0), 0);
  });

  // 💸 Inversión de la semana (optimizado con timestamps)
  weeklyInvestment = computed(() => {
    const weekAgoTime = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return this.entradas()
      .filter((m) => new Date(m.date).getTime() >= weekAgoTime)
      .reduce((sum, entrada) => sum + (entrada.totalCost || 0), 0);
  });

  // 💸 Inversión del mes (optimizado con timestamps)
  monthlyInvestment = computed(() => {
    const monthAgoTime = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return this.entradas()
      .filter((m) => new Date(m.date).getTime() >= monthAgoTime)
      .reduce((sum, entrada) => sum + (entrada.totalCost || 0), 0);
  });

  constructor() {
    if (!this.initialized) {
      this.initialized = true;
      this.initStaleWhileRevalidate();
    }
  }

  /**
   * 🚀 Estrategia Stale-While-Revalidate
   */
  private async initStaleWhileRevalidate(): Promise<void> {
    console.log('⚡ [Movements] Iniciando Stale-While-Revalidate...');

    // PASO 1: Cargar cache INMEDIATAMENTE
    await this.loadFromCache();

    // PASO 2: Actualizar desde Supabase si es necesario
    const shouldSync = this.shouldSyncWithSupabase();
    if (shouldSync) {
      console.log('🔄 [Movements] Actualizando desde Supabase en background...');
      this.loadFromSupabaseBackground();
    } else {
      console.log('✅ [Movements] Cache reciente');
      this.isLoading.set(false);
    }
  }

  private async loadFromCache(): Promise<boolean> {
    try {
      const cached = await this.localDb.getMovements();

      if (cached && cached.length > 0) {
        console.log(`⚡ [Movements] Cache: ${cached.length} movimientos`);
        this.movementsSignal.set(cached);
        this.isLoading.set(false);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('⚠️ [Movements] Error leyendo cache:', error);
      return false;
    }
  }

  private shouldSyncWithSupabase(): boolean {
    const lastSync = this.lastSyncTime();
    if (!lastSync) return true;

    const timeSinceLastSync = Date.now() - lastSync.getTime();
    return timeSinceLastSync > this.SYNC_INTERVAL_MS;
  }

  private loadFromSupabaseBackground(): void {
    this.syncFromSupabase();
  }

  private async syncFromSupabase(): Promise<void> {
    if (!navigator.onLine) {
      console.log('📴 [Movements] Sin conexión');
      this.isLoading.set(false);
      return;
    }

    try {
      // TODO: Implementar pull de Supabase
      console.log('☁️ [Movements] Sincronizando...');
      this.lastSyncTime.set(new Date());
    } catch (error) {
      console.error('❌ [Movements] Error sincronizando:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * 📥 Registrar entrada de inventario
   */
  registerEntrada(
    entrada: Omit<InventoryMovement, 'id' | 'movementNumber' | 'date' | 'type'>
  ): InventoryMovement | null {
    return this.errorHandler.handleSyncOperation(
      () => {
        const newMovement: InventoryMovement = {
          ...entrada,
          id: crypto.randomUUID(),
          movementNumber: this.generateMovementNumber('ENTRADA'),
          date: new Date(),
          type: 'entrada',
        };

        // Aumentar stock
        const success = this.productService.addStock(
          entrada.productId,
          entrada.quantity,
          entrada.variantId
        );

        if (!success) {
          throw new Error('No se pudo actualizar el stock');
        }

        // Agregar movimiento
        this.movementsSignal.update((current) => [newMovement, ...current]);

        // Sincronizar con Supabase
        this.syncService.queueForSync('inventory_movement', 'create', newMovement);

        // Guardar en IndexedDB
        this.localDb.saveMovement(newMovement);

        console.log('✅ Entrada registrada:', newMovement);
        return newMovement;
      },
      'Registro de entrada',
      'No se pudo registrar la entrada de inventario'
    );
  }

  /**
   * 📤 Registrar salida de inventario (manual)
   */
  registerSalida(
    salida: Omit<InventoryMovement, 'id' | 'movementNumber' | 'date' | 'type'>
  ): InventoryMovement | null {
    return this.errorHandler.handleSyncOperation(
      () => {
        const newMovement: InventoryMovement = {
          ...salida,
          id: crypto.randomUUID(),
          movementNumber: this.generateMovementNumber('SALIDA'),
          date: new Date(),
          type: 'salida',
        };

        // Reducir stock
        const success = this.productService.reduceStock(
          salida.productId,
          salida.quantity,
          salida.variantId
        );

        if (!success) {
          throw new Error('Stock insuficiente o producto no encontrado');
        }

        // Agregar movimiento
        this.movementsSignal.update((current) => [newMovement, ...current]);

        // Sincronizar
        this.syncService.queueForSync('inventory_movement', 'create', newMovement);

        // Guardar en IndexedDB
        this.localDb.saveMovement(newMovement);

        console.log('✅ Salida registrada:', newMovement);
        return newMovement;
      },
      'Registro de salida',
      'No se pudo registrar la salida de inventario'
    );
  }

  /**
   * 🔧 Registrar ajuste de inventario
   */
  registerAjuste(
    ajuste: Omit<InventoryMovement, 'id' | 'movementNumber' | 'date' | 'type'>
  ): InventoryMovement | null {
    return this.errorHandler.handleSyncOperation(
      () => {
        const newMovement: InventoryMovement = {
          ...ajuste,
          id: crypto.randomUUID(),
          movementNumber: this.generateMovementNumber('AJUSTE'),
          date: new Date(),
          type: 'ajuste',
        };

        // Actualizar stock (positivo o negativo)
        const success =
          ajuste.quantity > 0
            ? this.productService.addStock(ajuste.productId, ajuste.quantity, ajuste.variantId)
            : this.productService.reduceStock(
                ajuste.productId,
                Math.abs(ajuste.quantity),
                ajuste.variantId
              );

        if (!success) {
          throw new Error('No se pudo ajustar el stock');
        }

        this.movementsSignal.update((current) => [newMovement, ...current]);
        this.syncService.queueForSync('inventory_movement', 'create', newMovement);

        // Guardar en IndexedDB
        this.localDb.saveMovement(newMovement);

        console.log('✅ Ajuste registrado:', newMovement);
        return newMovement;
      },
      'Ajuste de inventario',
      'No se pudo realizar el ajuste'
    );
  }

  /**
   * Generar número de movimiento único
   */
  private generateMovementNumber(prefix: string): string {
    const count =
      this.movementsSignal().filter((m) => m.movementNumber.startsWith(prefix)).length + 1;

    return `${prefix}-${String(count).padStart(4, '0')}`;
  }

  /**
   * Obtener movimientos por producto
   */
  getMovementsByProduct(productId: string): InventoryMovement[] {
    return this.movementsSignal().filter((m) => m.productId === productId);
  }

  /**
   * Obtener movimientos por rango de fechas
   */
  getMovementsByDateRange(startDate: Date, endDate: Date): InventoryMovement[] {
    return this.movementsSignal().filter((m) => {
      const moveDate = new Date(m.date);
      return moveDate >= startDate && moveDate <= endDate;
    });
  }

  /**
   * 🔄 Sincronización manual
   */
  async forceSync(): Promise<void> {
    console.log('🔄 [Movements] Sincronización manual forzada...');
    await this.syncFromSupabase();
  }
}
