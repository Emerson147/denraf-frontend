import { Injectable, signal, computed, inject } from '@angular/core';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models';

/**
 * 🔍 POS Product Facade
 * 
 * Facade reutilizable para búsqueda, filtrado y gestión de productos en POS.
 * 
 * @example
 * ```typescript
 * private productFacade = inject(PosProductFacade);
 * 
 * // Buscar productos
 * this.productFacade.search('camisa');
 * 
 * // Filtrar por categoría
 * this.productFacade.filterByCategory('Polos');
 * 
 * // Obtener productos filtrados
 * const products = this.productFacade.filteredProducts();
 * ```
 */
@Injectable()
export class PosProductFacade {
  private productService = inject(ProductService);
  
  // Estado de búsqueda y filtros
  private searchQuerySignal = signal<string>('');
  private selectedCategorySignal = signal<string | null>(null);
  private loadingSignal = signal<boolean>(false);
  
  // Exposición readonly
  readonly searchQuery = this.searchQuerySignal.asReadonly();
  readonly selectedCategory = this.selectedCategorySignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  
  // Productos desde el servicio
  readonly products = this.productService.products;
  
  // Categorías únicas
  readonly categories = computed(() => {
    const cats = new Set(this.products().map(p => p.category));
    return Array.from(cats).sort();
  });
  
  // Productos filtrados
  readonly filteredProducts = computed(() => {
    let filtered = this.products();
    
    // Filtrar por categoría
    const category = this.selectedCategorySignal();
    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }
    
    // Filtrar por búsqueda
    const query = this.searchQuerySignal().toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        p.variants?.some(v => v.barcode?.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  });
  
  // Productos disponibles (con stock)
  readonly availableProducts = computed(() => 
    this.filteredProducts().filter(p => p.stock > 0)
  );
  
  // Productos sin stock
  readonly outOfStockProducts = computed(() => 
    this.filteredProducts().filter(p => p.stock === 0)
  );

  /**
   * Actualizar query de búsqueda
   * @param query Texto de búsqueda
   */
  search(query: string): void {
    this.searchQuerySignal.set(query);
  }

  /**
   * Filtrar por categoría
   * @param category Nombre de la categoría (null para todas)
   */
  filterByCategory(category: string | null): void {
    this.selectedCategorySignal.set(category);
  }

  /**
   * Limpiar todos los filtros
   */
  clearFilters(): void {
    this.searchQuerySignal.set('');
    this.selectedCategorySignal.set(null);
  }

  /**
   * Buscar producto por código de barras
   * @param barcode Código de barras
   * @returns Producto y variante encontrados
   */
  findByBarcode(barcode: string): { product: Product; variant?: any } | null {
    for (const product of this.products()) {
      if (product.variants) {
        const variant = product.variants.find(v => v.barcode === barcode);
        if (variant) {
          return { product, variant };
        }
      }
    }
    return null;
  }

  /**
   * Obtener producto por ID
   * @param productId ID del producto
   */
  getProductById(productId: string): Product | undefined {
    return this.products().find(p => p.id === productId);
  }

  /**
   * Verificar si hay productos filtrados
   */
  hasFilteredProducts(): boolean {
    return this.filteredProducts().length > 0;
  }

  /**
   * Obtener total de productos filtrados
   */
  getFilteredCount(): number {
    return this.filteredProducts().length;
  }

  /**
   * Verificar si hay filtros activos
   */
  hasActiveFilters(): boolean {
    return this.searchQuerySignal() !== '' || this.selectedCategorySignal() !== null;
  }

  /**
   * Establecer estado de carga
   * @param loading Estado de carga
   */
  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }
}
