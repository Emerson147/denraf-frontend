/**
 * 🔄 Sync Service
 *
 * Sincroniza datos entre IndexedDB (local) y Supabase (nube).
 * Permite trabajar offline y sincronizar cuando hay conexión.
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { LocalDbService, SyncQueueItem } from './local-db.service';
import { supabase } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private localDb = inject(LocalDbService);

  // Estado de conexión
  isOnline = signal(navigator.onLine);
  isSyncing = signal(false);
  pendingCount = signal(0);
  lastSyncAt = signal<Date | null>(null);

  // Estado derivado
  hasPending = computed(() => this.pendingCount() > 0);
  statusText = computed(() => {
    if (this.isSyncing()) return 'Sincronizando...';
    if (!this.isOnline()) return 'Offline';
    if (this.hasPending()) return `${this.pendingCount()} pendientes`;
    return 'Sincronizado';
  });

  constructor() {
    this.setupListeners();
    this.updatePendingCount();
  }

  /**
   * Configurar listeners de conexión
   */
  private setupListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Conexión restaurada');
      this.isOnline.set(true);
      this.syncAll(); // Sincronizar automáticamente
    });

    window.addEventListener('offline', () => {
      console.log('📴 Sin conexión');
      this.isOnline.set(false);
    });
  }

  /**
   * Agregar item a la cola de sincronización
   */
  async queueForSync(
    type: SyncQueueItem['type'],
    action: SyncQueueItem['action'],
    data: any
  ): Promise<void> {
    await this.localDb.addToSyncQueue({ type, action, data });
    await this.updatePendingCount();

    // Si hay internet, intentar sincronizar
    if (this.isOnline() && !this.isSyncing()) {
      this.syncAll();
    }
  }

  /**
   * Sincronizar todos los items pendientes
   */
  async syncAll(): Promise<boolean> {
    if (!this.isOnline() || this.isSyncing()) {
      return false;
    }

    this.isSyncing.set(true);
    let success = true;

    try {
      const queue = await this.localDb.getSyncQueue();
      console.log(`🔄 Sincronizando ${queue.length} items...`);

      for (const item of queue) {
        const itemSuccess = await this.syncItem(item);
        if (!itemSuccess) {
          success = false;
        }
      }

      this.lastSyncAt.set(new Date());
      console.log('✅ Sincronización completada');
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      success = false;
    } finally {
      this.isSyncing.set(false);
      await this.updatePendingCount();
    }

    return success;
  }

  /**
   * Sincronizar un item individual
   */
  private async syncItem(item: SyncQueueItem): Promise<boolean> {
    try {
      const table = this.getTableName(item.type);

      // 🔄 Adaptar datos de Angular a Supabase
      const adaptedData = this.adaptToSupabase(item.type, item.data);

      switch (item.action) {
        case 'create':
        case 'update':
          // Guardar producto principal
          const { error: upsertError } = await supabase.from(table).upsert(adaptedData);
          if (upsertError) throw upsertError;

          // 🔥 Si es un producto con variantes, sincronizar variantes en tabla separada
          if (item.type === 'product' && item.data.variants && item.data.variants.length > 0) {
            console.log(`🔄 Sincronizando ${item.data.variants.length} variantes para producto ${item.data.id}...`);
            await this.syncProductVariants(item.data.id, item.data.variants);
          } else if (item.type === 'product') {
            console.log('⚠️ Producto sin variantes o variantes vacías:', item.data.id);
          }
          break;

        case 'delete':
          const { error: deleteError } = await supabase.from(table).delete().eq('id', item.data.id);
          if (deleteError) throw deleteError;
          // Las variantes se eliminan automáticamente por CASCADE
          break;
      }

      // Éxito: eliminar de la cola
      await this.localDb.removeSyncItem(item.id);
      console.log(`✅ Sincronizado ${item.type}: ${item.action}`);
      return true;
    } catch (error) {
      console.error(`❌ Error sincronizando ${item.type}:`, error);

      // Incrementar reintentos
      item.retries++;

      if (item.retries >= 3) {
        console.error(`Item ${item.id} falló después de 3 intentos, eliminando`);
        await this.localDb.removeSyncItem(item.id);
      } else {
        await this.localDb.updateSyncItem(item);
      }

      return false;
    }
  }

  /**
   * � Sincronizar variantes de un producto en tabla separada
   */
  private async syncProductVariants(productId: string, variants: any[]): Promise<void> {
    console.log(`🔥 SYNC VARIANTES - Producto: ${productId}, Cantidad: ${variants.length}`, variants);
    try {
      // 1. Eliminar variantes existentes del producto
      await supabase
        .from('variantes')
        .delete()
        .eq('product_id', productId);

      // 2. Insertar nuevas variantes
      if (variants.length > 0) {
        const variantesData = variants.map(v => ({
          id: v.id, // Mantener el ID generado en el cliente
          product_id: productId,
          size: v.size,
          color: v.color || null,
          stock: v.stock || 0,
          barcode: v.barcode || null
        }));

        const { error } = await supabase
          .from('variantes')
          .insert(variantesData);

        if (error) throw error;
        console.log(`✅ ${variants.length} variantes sincronizadas para producto ${productId}`);
      }
    } catch (error) {
      console.error(`❌ Error sincronizando variantes:`, error);
      throw error; // Re-lanzar para que syncItem maneje el error
    }
  }

  /**
   * �🔄 Adaptar datos de Angular a formato Supabase
   * Angular usa camelCase, Supabase usa snake_case
   */
  private adaptToSupabase(type: string, data: any): any {
    if (type === 'product') {
      return {
        id: data.id,
        name: data.name,
        category: data.category,
        brand: data.brand,
        price: data.price,
        cost: data.cost,
        stock: data.stock,
        min_stock: data.minStock,
        sizes: data.sizes,
        colors: data.colors,
        // variants NO va aquí - se guarda en tabla separada
        image: data.image,
        barcode: data.barcode,
        status: data.status || 'active',
        created_at: data.createdAt,
        updated_at: data.updatedAt,
      };
    }

    if (type === 'sale') {
      // Validar si vendedor_id es UUID válido (evitar IDs antiguos como "user-2")
      const isValidUUID = (id: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      return {
        id: data.id,
        sale_number: data.saleNumber,
        subtotal: data.subtotal,
        discount: data.discount,
        tax: data.tax,
        total: data.total,
        payment_method: data.paymentMethod,
        status: data.status,
        notes: data.notes,
        created_by: data.createdBy,
        // Solo incluir vendedor_id si es UUID válido
        vendedor_id: data.vendedorId && isValidUUID(data.vendedorId) ? data.vendedorId : null,
        created_at: data.date,
      };
    }

    if (type === 'user') {
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        pin: data.pin,
        avatar: data.avatar,
        created_at: data.createdAt,
      };
    }

    if (type === 'sale_item') {
      // Validar que productId sea UUID válido
      const isValidUUID = (id: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      return {
        id: data.id,
        sale_id: data.saleId,
        product_id: data.productId && isValidUUID(data.productId) ? data.productId : null,
        product_name: data.productName,
        quantity: data.quantity,
        size: data.size,
        color: data.color,
        unit_price: data.unitPrice,
        subtotal: data.subtotal,
      };
    }

    // Si no hay adaptador, devolver datos originales
    return data;
  }

  /**
   * Obtener nombre de tabla en Supabase
   */
  private getTableName(type: SyncQueueItem['type']): string {
    const tables: Record<string, string> = {
      product: 'productos',
      sale: 'ventas',
      sale_item: 'venta_items',
      user: 'usuarios',
    };
    return tables[type] || type;
  }

  /**
   * Actualizar contador de pendientes
   */
  private async updatePendingCount() {
    const count = await this.localDb.getSyncQueueCount();
    this.pendingCount.set(count);
  }

  /**
   * 🔄 Cargar productos con reintento y fallback a paginación
   * Si la consulta completa falla por timeout, carga por lotes
   */
  private async pullProductsWithFallback(): Promise<any[]> {
    try {
      // INTENTO 1: Consulta completa simple (sin filtros)
      console.log('📦 Intentando carga completa de productos...');
      const { data: productosRaw, error: prodError } = await supabase
        .from('productos')
        .select(`
          id, name, category, brand, price, cost, stock, min_stock, sizes, colors, image, barcode, status, created_at, updated_at,
          variantes (
            id, size, color, stock, barcode
          )
        `)
        .limit(5000);

      if (!prodError && productosRaw && productosRaw.length > 0) {
        console.log(`✅ Carga completa exitosa: ${productosRaw.length} productos`);
        return productosRaw;
      }

      // INTENTO 2: Si hay error de timeout (57014), intentar con menos columnas
      if (prodError?.code === '57014') {
        console.warn('⚠️ Timeout en carga completa, intentando con columnas básicas...');
        const { data: basicData, error: basicError } = await supabase
          .from('productos')
          .select('id, name, category, price, stock, status')
          .limit(5000);

        if (!basicError && basicData) {
          console.log(`✅ Carga básica exitosa: ${basicData.length} productos (datos simplificados)`);
          return basicData;
        }
      }

      // INTENTO 3: Cargar por lotes de 500
      console.warn('⚠️ Fallback: Cargando productos por lotes...');
      return await this.pullProductsInBatches();

    } catch (error) {
      console.error('❌ Error crítico cargando productos:', error);
      return [];
    }
  }

  /**
   * 📦 Cargar productos por lotes (paginación)
   */
  private async pullProductsInBatches(batchSize = 500): Promise<any[]> {
    const allProducts: any[] = [];
    let offset = 0;
    let hasMore = true;

    try {
      while (hasMore) {
        const { data, error } = await supabase
          .from('productos')
          .select(`
            id, name, category, brand, price, cost, stock, status,
            variantes (
              id, size, color, stock, barcode
            )
          `)
          .range(offset, offset + batchSize - 1);

        if (error) {
          console.error(`❌ Error en lote offset ${offset}:`, error);
          break;
        }

        if (data && data.length > 0) {
          allProducts.push(...data);
          console.log(`📦 Lote cargado: ${data.length} productos (total: ${allProducts.length})`);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }

        // Límite de seguridad: máximo 10,000 productos
        if (allProducts.length >= 10000) {
          console.warn('⚠️ Límite de 10,000 productos alcanzado');
          break;
        }
      }

      return allProducts;
    } catch (error) {
      console.error('❌ Error en carga por lotes:', error);
      return allProducts; // Retornar lo que se pudo cargar
    }
  }

  /**
   * Descargar datos frescos de Supabase a IndexedDB
   * Retorna los productos adaptados al formato Angular
   * 
   * 🚀 OPTIMIZADO: Usa paginación y límites para consultas más rápidas
   */
  async pullFromCloud(): Promise<{ products: any[]; sales: any[] }> {
    if (!this.isOnline()) {
      return { products: [], sales: [] };
    }

    try {
      // 📦 Productos - Usar estrategia con fallback
      const productosRaw = await this.pullProductsWithFallback();

      if (productosRaw.length === 0) {
        console.error('❌ No se pudieron cargar productos de Supabase');
        return { products: [], sales: [] };
      }

      // Adaptar productos de Supabase a Angular
      // 🔍 FILTRAR en cliente: solo activos con stock >= 0
      const productos = (productosRaw || [])
        .filter((p: any) => p.status === 'active' && p.stock >= 0)
        .map((p: any) => this.adaptFromSupabase('product', p));

      console.log(`✅ Productos descargados: ${productosRaw?.length || 0} total, ${productos.length} después de filtros`);

      if (productos.length > 0) {
        await this.localDb.saveProducts(productos);
      } else {
        console.warn('⚠️ No se encontraron productos activos en Supabase');
      }

      // 🛒 Ventas - Solo últimas 100 con columnas específicas e items
      // Para reportes antiguos, se cargarán bajo demanda
      const { data: ventasRaw, error: saleError } = await supabase
        .from('ventas')
        .select(`
          id, sale_number, subtotal, discount, tax, total, 
          payment_method, status, notes, created_by, vendedor_id, created_at,
          venta_items (
            id, product_id, product_name, quantity, size, color, unit_price, subtotal
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100); // Últimas 100 ventas para dashboard

      if (saleError) {
        console.error('Error descargando ventas:', saleError);
      }

      const ventas = (ventasRaw || []).map((v: any) => this.adaptFromSupabase('sale', v));

      if (ventas.length > 0) {
        await this.localDb.saveSales(ventas);
      }

      console.log(`⬇️ Datos descargados: ${productos.length} productos, ${ventas.length} ventas`);
      return { products: productos, sales: ventas };
    } catch (error) {
      console.error('Error descargando datos:', error);
      return { products: [], sales: [] };
    }
  }

  /**
   *  Adaptar datos de Supabase a formato Angular
   * Supabase usa snake_case, Angular usa camelCase
   */
  private adaptFromSupabase(type: string, data: any): any {
    if (type === 'product') {
      // Mapear variantes desde la relación (tabla variantes)
      const variants = data.variantes 
        ? data.variantes.map((v: any) => ({
            id: v.id,
            size: v.size,
            color: v.color || '',
            stock: v.stock || 0,
            barcode: v.barcode || ''
          }))
        : [];

      return {
        id: data.id,
        name: data.name,
        category: data.category,
        brand: data.brand,
        price: Number(data.price),
        cost: Number(data.cost || 0),
        stock: data.stock || 0,
        minStock: data.min_stock || 5,
        sizes: data.sizes || [],
        colors: data.colors || [],
        variants: variants, // 🔥 Variantes mapeadas desde tabla relacional
        image: data.image,
        barcode: data.barcode,
        status: data.status || 'active',
        createdAt: data.created_at ? new Date(data.created_at) : new Date(),
        updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
      };
    }

    if (type === 'sale') {
      // Adaptar items si vienen de la relación venta_items
      const items = data.venta_items 
        ? data.venta_items.map((item: any) => ({
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            unitPrice: Number(item.unit_price),
            subtotal: Number(item.subtotal)
          }))
        : [];

      // 🔧 FIX: Convertir fecha UTC de Supabase a Date correctamente
      // Supabase devuelve timestamps sin 'Z', hay que asegurar que se interprete como UTC
      let saleDate: Date;
      if (data.created_at) {
        const dateStr = data.created_at;
        // Si no tiene indicador de timezone, añadir 'Z' para interpretarlo como UTC
        if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
          saleDate = new Date(dateStr + 'Z');
        } else {
          saleDate = new Date(dateStr);
        }
      } else {
        saleDate = new Date();
      }

      return {
        id: data.id,
        saleNumber: data.sale_number,
        date: saleDate,
        items: items, // Items adaptados desde venta_items
        subtotal: Number(data.subtotal),
        discount: Number(data.discount || 0),
        tax: Number(data.tax || 0),
        total: Number(data.total),
        paymentMethod: data.payment_method,
        status: data.status,
        notes: data.notes,
        createdBy: data.created_by,
        vendedorId: data.vendedor_id,
      };
    }

    return data;
  }

  /**
   * 🔍 Cargar ventas por rango de fechas (lazy loading para reportes)
   */
  async pullSalesByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    if (!this.isOnline()) return [];

    try {
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          id, sale_number, subtotal, discount, tax, total, 
          payment_method, status, notes, created_by, vendedor_id, created_at,
          venta_items (
            id, product_id, product_name, quantity, size, color, unit_price, subtotal
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((v: any) => this.adaptFromSupabase('sale', v));
    } catch (error) {
      console.error('Error cargando ventas por rango:', error);
      return [];
    }
  }

  /**
   * 🔍 Cargar productos por categoría (lazy loading)
   */
  async pullProductsByCategory(category: string): Promise<any[]> {
    if (!this.isOnline()) return [];

    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          id, name, category, brand, price, cost, stock, min_stock, sizes, colors, image, barcode, status,
          variantes (
            id, size, color, stock, barcode
          )
        `)
        .eq('category', category)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      return (data || []).map((p: any) => this.adaptFromSupabase('product', p));
    } catch (error) {
      console.error('Error cargando productos por categoría:', error);
      return [];
    }
  }

  /**
   * 🔍 Buscar productos (lazy loading con búsqueda)
   */
  async searchProducts(query: string): Promise<any[]> {
    if (!this.isOnline()) return [];

    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          id, name, category, brand, price, stock, image, barcode,
          variantes (
            id, size, color, stock, barcode
          )
        `)
        .eq('status', 'active')
        .or(`name.ilike.%${query}%,barcode.eq.${query},brand.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      return (data || []).map((p: any) => this.adaptFromSupabase('product', p));
    } catch (error) {
      console.error('Error buscando productos:', error);
      return [];
    }
  }
}
