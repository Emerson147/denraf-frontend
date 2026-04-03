import { Injectable, signal, inject } from '@angular/core';
import { Sale } from '../models';
import { LoggerService } from './logger.service';

interface SaleRecord {
  id: string;
  data: Omit<Sale, 'id' | 'saleNumber' | 'date'>;
  timestamp: number;
  synced: boolean;
}

interface InventoryRecord {
  id: string;
  data: { productId: string; quantity: number; operation: 'add' | 'subtract' };
  timestamp: number;
  synced: boolean;
}

interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entity: 'sales' | 'inventory' | 'clients';
  data: Sale | InventoryRecord['data'];
  timestamp: number;
  retries: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'denraf-offline';
  private readonly DB_VERSION = 1;
  
  // Estado de conexión
  isOnline = signal(navigator.onLine);
  pendingSync = signal(0);
  
  constructor() {
    this.initDB();
    this.setupConnectionListeners();
    
    // Exponer globalmente en desarrollo para testing
    if (typeof window !== 'undefined') {
      (window as any).offlineService = this;
      console.log('🔧 [DEV] OfflineService disponible en window.offlineService');
    }
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.updatePendingCount();
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para ventas offline
        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
          salesStore.createIndex('synced', 'synced', { unique: false });
          salesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para inventario offline
        if (!db.objectStoreNames.contains('inventory')) {
          const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id' });
          inventoryStore.createIndex('synced', 'synced', { unique: false });
          inventoryStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Cola de sincronización
        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('entity', 'entity', { unique: false });
        }
      };
    });
  }

  private setupConnectionListeners() {
    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
    });
  }

  // Guardar venta offline
  async saveSaleOffline(sale: Omit<Sale, 'id' | 'saleNumber' | 'date'>): Promise<void> {
    if (!this.db) return;

    const id = crypto.randomUUID();
    const record: SaleRecord = {
      id,
      data: sale,
      timestamp: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sales'], 'readwrite');
      const store = transaction.objectStore('sales');
      const request = store.put(record);

      request.onsuccess = async () => {
        await this.addToSyncQueue('create', 'sales', { ...sale, id });
        await this.updatePendingCount();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Agregar operación a la cola de sincronización
  private async addToSyncQueue(
    operation: 'create' | 'update' | 'delete',
    entity: 'sales' | 'inventory' | 'clients',
    data: any
  ): Promise<void> {
    if (!this.db) return;

    const item: SyncQueueItem = {
      id: crypto.randomUUID(),
      operation,
      entity,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Sincronizar operaciones pendientes
  async syncPendingOperations(): Promise<void> {
    if (!this.db || !this.isOnline()) return;

    console.log('🔄 Iniciando sincronización...');
    const queue = await this.getAllFromStore<SyncQueueItem>('syncQueue');
    console.log(`📋 Operaciones en cola: ${queue.length}`);
    
    for (const item of queue) {
      try {
        // Aquí se haría la petición HTTP real a tu backend
        console.log(`📤 Sincronizando ${item.operation} en ${item.entity}`, item.data);
        
        // Simular sincronización exitosa (500ms)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Marcar como sincronizado en sales
        if (item.entity === 'sales') {
          const saleData = item.data as Omit<Sale, 'id' | 'saleNumber' | 'date'>;
          const saleId = `SALE-${Date.now()}`;
          const sale = await this.getFromStore<SaleRecord>('sales', saleId);
          if (sale) {
            const updatedSale: SaleRecord = { ...sale, synced: true };
            await this.putInStore('sales', updatedSale);
            console.log(`✅ Venta marcada como sincronizada: ${saleId}`);
            
            // 🎯 AGREGAR AL SISTEMA DE VENTAS REAL
            this.addToSalesSystem(sale.data);
          }
        }

        // Remover de la cola
        await this.deleteFromStore('syncQueue', item.id);
        console.log(`🗑️ Operación removida de la cola: ${item.id}`);
        
      } catch (error) {
        console.error('❌ Error sincronizando:', error);
        
        // Incrementar contador de reintentos
        if (item.retries < 3) {
          const updatedItem: SyncQueueItem = { ...item, retries: item.retries + 1 };
          await this.putInStore('syncQueue', updatedItem);
          console.log(`⚠️ Reintento ${item.retries + 1}/3 para operación ${item.id}`);
        } else {
          console.error('💀 Operación descartada después de 3 intentos:', item);
        }
      }
    }

    await this.updatePendingCount();
    const finalCount = this.pendingSync();
    console.log(`✨ Sincronización completada. Pendientes: ${finalCount}`);
  }
  
  // Agregar venta offline al sistema de ventas principal
  private addToSalesSystem(saleData: Omit<Sale, 'id' | 'saleNumber' | 'date'>): void {
    try {
      // Cargar ventas actuales de localStorage
      const stored = localStorage.getItem('denraf_sales');
      const currentSales = stored ? JSON.parse(stored) : [];
      
      // Crear objeto de venta en el formato correcto
      const newSale = {
        id: `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        saleNumber: this.generateSaleNumber(currentSales.length + 1),
        date: new Date().toISOString(),
        customer: saleData.customer || null,
        items: saleData.items || [],
        subtotal: saleData.subtotal || saleData.total || 0,
        discount: saleData.discount || 0,
        total: saleData.total || 0,
        paymentMethod: saleData.paymentMethod || 'cash',
        status: 'completed',
        notes: `[OFFLINE] ${saleData.notes || 'Venta creada offline'}`
      };
      
      // Agregar al inicio del array (más recientes primero)
      currentSales.unshift(newSale);
      
      // Guardar de vuelta en localStorage
      localStorage.setItem('denraf_sales', JSON.stringify(currentSales));
      
      console.log('💾 Venta agregada al sistema principal:', newSale.saleNumber);
      
      // Disparar evento para que otros componentes se actualicen
      window.dispatchEvent(new CustomEvent('sales-updated'));
      
    } catch (error) {
      console.error('Error agregando venta al sistema:', error);
    }
  }
  
  // Generar número de venta
  private generateSaleNumber(count: number): string {
    return `VENTA-${String(count).padStart(4, '0')}`;
  }

  // Actualizar contador de operaciones pendientes
  private async updatePendingCount(): Promise<void> {
    if (!this.db) return;
    const count = await this.countStore('syncQueue');
    this.pendingSync.set(count);
  }

  // Obtener ventas offline (para mostrar en la UI)
  async getOfflineSales(): Promise<any[]> {
    if (!this.db) return [];
    const sales = await this.getAllFromStore<SaleRecord>('sales');
    return sales
      .filter(sale => !sale.synced)
      .map(sale => sale.data);
  }

  // Limpiar datos sincronizados antiguos (más de 7 días)
  async cleanOldData(): Promise<void> {
    if (!this.db) return;
    
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const oldSales = await this.getAllFromStore<SaleRecord>('sales');
    
    for (const sale of oldSales) {
      if (sale.synced && sale.timestamp < sevenDaysAgo) {
        await this.deleteFromStore('sales', sale.id);
      }
    }
  }

  // Helpers para IndexedDB nativa
  private getFromStore<T>(storeName: string, key: string): Promise<T | undefined> {
    if (!this.db) return Promise.resolve(undefined);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private getAllFromStore<T>(storeName: string): Promise<T[]> {
    if (!this.db) return Promise.resolve([]);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private putInStore<T>(storeName: string, value: T): Promise<void> {
    if (!this.db) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private deleteFromStore(storeName: string, key: string): Promise<void> {
    if (!this.db) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private countStore(storeName: string): Promise<number> {
    if (!this.db) return Promise.resolve(0);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
