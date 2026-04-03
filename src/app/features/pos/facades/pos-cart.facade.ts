import { Injectable, signal, computed } from '@angular/core';
import { Product, ProductVariant } from '../../../core/models';

/**
 * 🛒 POS Cart Facade
 * 
 * Facade reutilizable para gestión de carrito de compras.
 * Maneja toda la lógica de negocio del carrito de forma independiente.
 * 
 * @example
 * ```typescript
 * private cartFacade = inject(PosCartFacade);
 * 
 * // Agregar producto
 * this.cartFacade.addItem(product, variant);
 * 
 * // Obtener total
 * const total = this.cartFacade.total();
 * ```
 */

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: ProductVariant;
}

@Injectable()
export class PosCartFacade {
  // Estado del carrito
  private cartItems = signal<CartItem[]>([]);
  
  // Exposición readonly
  readonly items = this.cartItems.asReadonly();
  readonly cart = this.cartItems.asReadonly(); // Alias para compatibilidad
  
  // Computeds del carrito
  readonly itemCount = computed(() => this.cartItems().length);
  
  readonly totalItems = computed(() => 
    this.cartItems().reduce((sum, item) => sum + item.quantity, 0)
  );
  
  readonly subtotal = computed(() => 
    this.cartItems().reduce((sum, item) => 
      sum + (item.product.price * item.quantity), 0
    )
  );
  
  readonly tax = computed(() => this.subtotal() * 0.18);
  
  readonly total = computed(() => this.subtotal() + this.tax());
  
  readonly isEmpty = computed(() => this.cartItems().length === 0);

  /**
   * Agregar producto al carrito
   * @param product Producto a agregar
   * @param variant Variante seleccionada (opcional)
   * @returns Objeto con success y message
   */
  addItem(product: Product, variant?: ProductVariant): { success: boolean; message?: string } {
    // Validar stock
    const availableStock = variant ? variant.stock : product.stock;
    if (availableStock === 0) {
      return { success: false, message: 'Sin stock disponible' };
    }

    // Buscar si ya existe
    const existingItem = this.cartItems().find(item => 
      item.product.id === product.id && 
      item.variant?.id === variant?.id
    );
    
    if (existingItem) {
      // Verificar stock máximo
      if (existingItem.quantity >= availableStock) {
        return { success: false, message: 'Stock máximo alcanzado' };
      }
      
      // Incrementar cantidad
      this.updateQuantity(product.id, variant?.id, 1);
    } else {
      // Agregar nuevo item
      this.cartItems.update(cart => [...cart, { 
        product, 
        quantity: 1, 
        variant 
      }]);
    }
    
    return { success: true };
  }

  /**
   * Actualizar cantidad de un item
   * @param productId ID del producto
   * @param variantId ID de la variante (opcional)
   * @param change Cambio en la cantidad (+1 o -1)
   * @returns Objeto con success y message
   */
  updateQuantity(productId: string, variantId: string | undefined, change: number): { success: boolean; message?: string } {
    let result = { success: true, message: undefined as string | undefined };
    
    this.cartItems.update(cart => {
      return cart.map(item => {
        if (item.product.id === productId && item.variant?.id === variantId) {
          const newQuantity = item.quantity + change;
          
          // No permitir cantidad menor a 1
          if (newQuantity <= 0) {
            result = { success: false, message: 'Cantidad mínima es 1' };
            return item;
          }
          
          // Verificar stock máximo
          const maxStock = item.variant ? item.variant.stock : item.product.stock;
          if (newQuantity > maxStock) {
            result = { success: false, message: 'Stock insuficiente' };
            return item;
          }
          
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
    });
    
    return result;
  }

  /**
   * Remover item del carrito
   * @param productId ID del producto
   * @param variantId ID de la variante (opcional)
   */
  removeItem(productId: string, variantId?: string): void {
    this.cartItems.update(cart => 
      cart.filter(item => 
        !(item.product.id === productId && item.variant?.id === variantId)
      )
    );
  }

  /**
   * Vaciar todo el carrito
   */
  clear(): void {
    this.cartItems.set([]);
  }

  /**
   * Obtener item específico del carrito
   * @param productId ID del producto
   * @param variantId ID de la variante (opcional)
   */
  getItem(productId: string, variantId?: string): CartItem | undefined {
    return this.cartItems().find(item => 
      item.product.id === productId && 
      item.variant?.id === variantId
    );
  }

  /**
   * Verificar si un producto está en el carrito
   * @param productId ID del producto
   * @param variantId ID de la variante (opcional)
   */
  hasItem(productId: string, variantId?: string): boolean {
    return this.getItem(productId, variantId) !== undefined;
  }

  /**
   * Obtener cantidad de un producto en el carrito
   * @param productId ID del producto
   * @param variantId ID de la variante (opcional)
   */
  getItemQuantity(productId: string, variantId?: string): number {
    const item = this.getItem(productId, variantId);
    return item?.quantity ?? 0;
  }
}
