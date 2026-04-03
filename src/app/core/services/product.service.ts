import { Injectable, signal, computed, inject } from '@angular/core';
import { Product } from '../models';
import { ErrorHandlerService } from './error-handler.service';
import { ApiService } from './api.service';

/**
 * 🚀 ProductService - API REST Architecture
 * 
 * Estrategia:
 * 1. API Rest como fuente de verdad
 * 2. Actualizaciones optimistas en el cliente
 * 3. Actualizaciones en background a la DB sin bloquear la UI
 */
@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private errorHandler = inject(ErrorHandlerService);
  private api = inject(ApiService);

  // ✅ FUENTE ÚNICA DE VERDAD - Todos los productos del sistema
  private productsSignal = signal<Product[]>([]);

  // 🔄 Estado de carga y sincronización
  isLoading = signal(true);
  isSyncing = signal(false);
  
  // 🎯 Control de inicialización única
  private initialized = false;

  constructor() {
    // 🚀 Inicialización optimizada: solo una vez
    if (!this.initialized) {
      this.initialized = true;
      this.loadProducts();
    }
  }

  /**
   * Cargar productos desde API
   */
  private loadProducts(): void {
    this.isLoading.set(true);
    this.api.get<any>('productos').subscribe({
      next: (response) => {
        // Extraer .content si el backend devuelve un objeto Page de Spring Boot
        let products = response && response.content ? response.content : response;
        
        // Ahora el backend responde con category y variants directamente
        products = (products || []).map((p: any) => ({
          ...p
        }));

        this.productsSignal.set(products);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error cargando productos:', error);
        this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)));
        this.isLoading.set(false);
      }
    });
  }

  // ✅ API pública para acceder a productos
  products = this.productsSignal.asReadonly();

  // 🔤 Productos ordenados alfabéticamente (ordenamiento en cliente, no en DB)
  sortedProducts = computed(() => {
    const prods = this.productsSignal();
    return [...prods].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Computed útiles
  activeProducts = computed(() => this.productsSignal().filter((p) => p.stock > 0 && p.status !== 'archived'));

  lowStockProducts = computed(() =>
    this.productsSignal().filter((p) => p.stock > 0 && p.stock <= 10 && p.status !== 'archived')
  );

  outOfStockProducts = computed(() => this.productsSignal().filter((p) => p.stock === 0 && p.status !== 'archived'));

  totalInventoryValue = computed(() =>
    this.productsSignal().reduce((sum, p) => p.status === 'archived' ? sum : sum + p.cost * p.stock, 0)
  );

  // ✅ MÉTODOS PARA SINCRONIZACIÓN

  /**
   * 🔄 Forzar recarga de productos desde el servidor
   */
  async forceSync(): Promise<void> {
    console.log('🔄 Sincronización manual forzada...');
    this.isSyncing.set(true);
    return new Promise((resolve) => {
      this.api.get<any>('productos').subscribe({
        next: (response) => {
          // Extraer .content si el backend devuelve un objeto Page de Spring Boot
          let products = response && response.content ? response.content : response;
          
          // Ahora el backend responde con category y variants directamente
          products = (products || []).map((p: any) => ({
            ...p
          }));

          this.productsSignal.set(products);
          this.isSyncing.set(false);
          resolve();
        },
        error: (error) => {
          console.error('❌ Error forzando sync:', error);
          this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)));
          this.isSyncing.set(false);
          resolve();
        }
      });
    });
  }

  /**
   * Obtener un producto por ID
   */
  getProductById(id: string): Product | undefined {
    return this.productsSignal().find((p) => p.id === id);
  }

  /**
   * Obtener producto por código de barras
   */
  getProductByBarcode(barcode: string): Product | undefined {
    return this.productsSignal().find((p) => p.barcode === barcode);
  }

  /**
   * Actualizar stock de un producto
   * ⚠️ CRÍTICO: Este método se llama desde SalesService al registrar ventas
   */
  updateStock(productId: string, quantityChange: number, variantId?: string): boolean {
    return (
      this.errorHandler.handleSyncOperation(
        () => {
          const products = this.productsSignal();
          const index = products.findIndex((p) => p.id === productId);

          if (index === -1) {
            throw new Error(`Producto no encontrado: ${productId}`);
          }

          const product = products[index];
          let updatedProduct = { ...product };

          // Si se especifica variantId, actualizar stock de la variante
          if (variantId && product.variants) {
            const variantIndex = product.variants.findIndex(v => v.id === variantId);
            
            if (variantIndex === -1) {
              throw new Error(`Variante no encontrada: ${variantId}`);
            }

            const variant = product.variants[variantIndex];
            const newVariantStock = variant.stock + quantityChange;

            // No permitir stock negativo en variante
            if (newVariantStock < 0) {
              throw new Error(
                `Stock insuficiente para ${product.name} (${variant.size}/${variant.color}). Stock actual: ${
                  variant.stock
                }, requerido: ${Math.abs(quantityChange)}`
              );
            }

            // Actualizar variante
            const updatedVariants = [...product.variants];
            updatedVariants[variantIndex] = {
              ...variant,
              stock: newVariantStock
            };

            updatedProduct = {
              ...product,
              variants: updatedVariants,
              stock: updatedVariants.reduce((sum, v) => sum + v.stock, 0), // Recalcular stock total
              updatedAt: new Date(),
            };
          } else {
            // Actualizar stock del producto principal (sin variantes)
            const newStock = product.stock + quantityChange;

            // No permitir stock negativo
            if (newStock < 0) {
              throw new Error(
                `Stock insuficiente para ${product.name}. Stock actual: ${
                  product.stock
                }, requerido: ${Math.abs(quantityChange)}`
              );
            }

            updatedProduct = {
              ...product,
              stock: newStock,
              updatedAt: new Date(),
            };
          }

          // Actualizar el array inmutablemente
          const updatedProducts = [...products];
          updatedProducts[index] = updatedProduct;

          // Optimista
          this.productsSignal.set(updatedProducts);

          // 🔄 Sincronizar cambio de stock con Backend en background
          this.api.put(`productos/${productId}`, updatedProduct).subscribe({
            error: (err) => {
              console.error('❌ Error al actualizar stock en el servidor:', err);
              // Si se requiere en el futuro, revertir la UI aquí en caso de fallo
            }
          });

          return true;
        },
        'Actualización de stock',
        'No se pudo actualizar el stock del producto'
      ) || false
    );
  }

  /**
   * Reducir stock al registrar una venta
   * Llamado desde SalesService
   */
  reduceStock(productId: string, quantity: number, variantId?: string): boolean {
    return this.updateStock(productId, -quantity, variantId);
  }

  /**
   * Aumentar stock al recibir inventario
   */
  addStock(productId: string, quantity: number, variantId?: string): boolean {
    return this.updateStock(productId, quantity, variantId);
  }

  /**
   * Agregar un nuevo producto
   */
  addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product | null {
    return this.errorHandler.handleSyncOperation(
      () => {
        // Validación de campos requeridos
        if (!product.name || !product.category || product.price <= 0) {
          throw new Error('Datos del producto inválidos');
        }

        const newProduct: Product = {
          ...product,
          id: crypto.randomUUID(), // Optimista: asume soporte de UUID local
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Agregar optimista
        this.productsSignal.update((products) => [...products, newProduct]);

        // 🔄 Guardar en el Backend en background
        this.api.post<Product>('productos', newProduct).subscribe({
          next: (savedProduct) => {
            // Si la base de datos devuelve un ID distinto u otros datos, lo actualizamos localmente
            if (savedProduct && savedProduct.id && savedProduct.id !== newProduct.id) {
              this.productsSignal.update((products) =>
                products.map((p) => (p.id === newProduct.id ? { ...savedProduct } : p))
              );
            }
          },
          error: (err) => {
            console.error('❌ Error creando producto en API:', err);
          }
        });

        return newProduct;
      },
      'Creación de producto',
      'No se pudo crear el producto'
    );
  }

  /**
   * Actualizar un producto existente
   */
  updateProduct(id: string, updates: Partial<Product>): boolean {
    return (
      this.errorHandler.handleSyncOperation(
        () => {
          const products = this.productsSignal();
          const index = products.findIndex((p) => p.id === id);

          if (index === -1) {
            throw new Error(`Producto ${id} no encontrado`);
          }

          const updatedProducts = [...products];
          updatedProducts[index] = {
            ...updatedProducts[index],
            ...updates,
            id, // Asegurar que el ID no cambie
            updatedAt: new Date(),
          };

          // Actualizar en interfaz de manera optimista
          this.productsSignal.set(updatedProducts);

          // 🔄 Actualizar en Background
          this.api.put(`productos/${id}`, updatedProducts[index]).subscribe({
            error: (err) => console.error(`❌ Error actualizando producto ${id} en API:`, err)
          });
          
          return true;
        },
        'Actualización de producto',
        'No se pudo actualizar el producto'
      ) || false
    );
  }

  /**
   * Eliminar un producto (Soft Delete - cambia estado a 'archived')
   * No elimina físicamente si tiene ventas asociadas
   */
  async deleteProduct(id: string): Promise<boolean> {
    return (
      this.errorHandler.handleSyncOperation(
        () => {
          const products = this.productsSignal();
          const product = products.find((p) => p.id === id);

          if (!product) {
            throw new Error(`Producto ${id} no encontrado`);
          }

          // 🔄 Soft Delete local optimista
          const updatedProduct = { ...product, status: 'archived' as const };
          
          // Quitamos visualmente del array para la UI
          const filtered = products.filter((p) => p.id !== id);
          this.productsSignal.set(filtered);

          // 🔄 Actualización en backend en background (usaremos DELETE o un PUT dependiendo de cómo lo maneje tu backend)
          // La interfaz previa no indicaba el endpoint, se asume estándar:
          this.api.delete(`productos/${id}`).subscribe({
            error: (err) => console.error(`❌ Error eliminando producto archivado ${id}:`, err)
          });
          
          console.log(`✅ Producto ${id} eliminado/archivado correctamente`);
          return true;
        },
        'Archivado de producto',
        'No se pudo archivar el producto'
      ) || false
    );
  }

  /**
   * Buscar productos por nombre o categoría
   */
  searchProducts(query: string): Product[] {
    const q = query.toLowerCase();
    return this.productsSignal().filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q))
    );
  }

  /**
   * Obtener productos por categoría
   */
  getProductsByCategory(category: string): Product[] {
    return this.productsSignal().filter((p) => p.category === category);
  }

  /**
   * Obtener todas las categorías únicas
   */
  getCategories(): string[] {
    const categories = this.productsSignal().map((p) => p.category);
    return Array.from(new Set(categories)).sort();
  }
}
