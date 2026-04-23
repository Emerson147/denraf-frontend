import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  effect,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { ProductVariant } from '../../../core/models';
import {
  UiInputComponent,
  UiButtonComponent,
  UiAnimatedDialogComponent,
  UiLabelComponent,
  UiPageHeaderComponent,
} from '../../../shared/ui';
import { ImageFallbackDirective } from '../../../shared/directives/image-fallback.directive';

@Component({
  selector: 'app-productos-page',
  standalone: true,
  imports: [
    CommonModule,
    ScrollingModule, // 🚀 Virtual Scrolling
    UiInputComponent,
    UiButtonComponent,
    UiAnimatedDialogComponent,
    UiLabelComponent,
    UiPageHeaderComponent,
    ImageFallbackDirective,
  ],
  templateUrl: './productos-page.component.html',
  styleUrls: ['./productos-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush, // 🚀 Optimización de Change Detection
})
export class ProductosPageComponent {
  private productService = inject(ProductService);
  private cloudinary = inject(CloudinaryService);
  private destroyRef = inject(DestroyRef);

  // 🚀 Debounce para búsqueda (Fase 2)
  private searchSubject = new Subject<string>();
  private debouncedSearch = signal('');

  constructor() {
    // 🚀 Configurar debounce de 300ms para la búsqueda
    const subscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.debouncedSearch.set(value);
      });

    // 🧹 Cleanup automático
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  // 🖼️ Estado de upload de imagen
  isUploadingImage = signal(false);
  uploadProgress = signal(0);
  selectedFile = signal<File | null>(null);

  // Productos desde el servicio central
  products = this.productService.products;

  // Señales para búsqueda y modal
  searchQuery = signal('');

  // 🆕 Sistema de filtros inicial
  selectedCategory = signal<string | null>(null);
  selectedGender = signal<string | null>(null);

  // Categorías disponibles
  categories = computed(() => {
    const cats = new Set(this.products().map((p) => p.category));
    return Array.from(cats).sort();
  });

  // Método para manejar cambios en input de búsqueda
  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject.next(value); // 🚀 Trigger debounce
    this.currentPage.set(1);
  }

  isDialogOpen = signal(false);
  editingProductId = signal<string | null>(null); // Producto que se está editando
  modalTitle = computed(() => (this.editingProductId() ? 'Editar Producto' : 'Nuevo Producto'));

  // Señales para el formulario de creación/edición
  productName = signal('');
  productCategory = signal('General');
  productBrand = signal('');
  productBarcode = signal('');
  initialStock = signal(0);
  activeSizeTab = signal<string>('S'); // Talla activa en el modal
  costPrice = signal(0);
  salePrice = signal(0);
  selectedImage = signal<string | null>(null);
  variants = signal<ProductVariant[]>([]); // Variantes del producto
  expandedProductId = signal<string | null>(null); // Para expandir/contraer variantes en cards

  // 🆕 Paginación y Modales
  currentPage = signal(1);
  pageSize = signal(10);
  activeModalTab = signal<'INFO' | 'VARIANTS' | 'FINANCE'>('INFO');
  expandedTableProductId = signal<string | null>(null);

  // Tallas y colores disponibles
  availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  availableColors = ['Negro', 'Blanco', 'Gris', 'Azul', 'Rojo', 'Verde', 'Amarillo', 'Rosa'];

  // Computed: Tallas únicas que tienen variantes
  activeSizes = computed(() => {
    const sizes = new Set(this.variants().map((v) => v.size));
    return Array.from(sizes);
  });

  // Computed: Colores para la talla activa
  activeColors = computed(() => {
    const activeSize = this.activeSizeTab();
    return this.variants()
      .filter((v) => v.size === activeSize)
      .map((v) => v.color);
  });

  // Computed: Ganancia y margen en tiempo real
  profit = computed(() => this.salePrice() - this.costPrice());
  margin = computed(() => {
    if (this.salePrice() === 0) return 0;
    return ((this.profit() / this.salePrice()) * 100).toFixed(1);
  });

  // Computed: Validación del formulario
  isFormValid = computed(() => {
    return (
      this.productName().trim().length > 0 &&
      this.costPrice() > 0 &&
      this.salePrice() > 0 &&
      this.salePrice() > this.costPrice() &&
      this.variants().length > 0 &&
      this.variants().every((v) => v.stock >= 0)
    );
  });

  // Computed: Stock total de todas las variantes
  totalStock = computed(() => {
    return this.variants().reduce((sum, v) => sum + v.stock, 0);
  });

  // Computed: Filtrar productos por búsqueda (con debounce) y filtros
  filteredProducts = computed(() => {
    let filtered = this.products();

    // Filtrar por categoría si está seleccionada
    const category = this.selectedCategory();
    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }

    // Filtrar por género si está seleccionado (asumiendo que tienes un campo 'gender' en el producto)
    const gender = this.selectedGender();
    if (gender) {
      // Si no tienes un campo 'gender', puedes usar categorías o nombre
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(gender.toLowerCase()) ||
          p.category.toLowerCase().includes(gender.toLowerCase())
      );
    }

    // Filtrar por búsqueda
    const query = this.debouncedSearch().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  // Computed: Productos Paginados
  paginatedProducts = computed(() => {
    const products = this.filteredProducts();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return products.slice(start, end);
  });

  // Computed: Total de páginas
  totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredProducts().length / this.pageSize()));
  });

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  generateBarcode() {
    this.productBarcode.set(`BAR-${Math.floor(Math.random() * 1000000)}`);
  }

  // MÉTODOS

  /**
   * Aplicar filtro de categoría
   */
  applyCategory(category: string) {
    // Toggle: Si ya está seleccionada, deseleccionar
    if (this.selectedCategory() === category) {
      this.clearFilters();
      return;
    }
    this.selectedCategory.set(category);
    this.currentPage.set(1);
  }

  /**
   * Ver todos los productos (sin filtros)
   */
  viewAllProducts() {
    this.clearFilters();
  }

  /**
   * Limpiar filtros activos
   */
  clearFilters() {
    this.selectedCategory.set(null);
    this.selectedGender.set(null);
    this.searchQuery.set('');
    this.debouncedSearch.set('');
    this.currentPage.set(1);
  }

  /**
   * Abrir modal para crear un nuevo producto
   */
  openCreate() {
    this.editingProductId.set(null);
    this.resetForm();
    this.activeModalTab.set('INFO');
    this.isDialogOpen.set(true);
  }

  /**
   * Abrir modal para editar un producto existente
   */
  openEdit(productId: string) {
    const product = this.products().find((p) => p.id === productId);
    if (!product) return;

    this.editingProductId.set(productId);
    this.productName.set(product.name);
    this.productBrand.set(product.brand || '');
    this.productBarcode.set(product.barcode || '');
    this.productCategory.set(product.category);
    this.costPrice.set(product.cost);
    this.salePrice.set(product.price);
    this.selectedImage.set(product.image || null);

    // Cargar variantes existentes
    if (product.variants && product.variants.length > 0) {
      this.variants.set([...product.variants]);
      // Establecer la primera talla como activa
      const firstSize = product.variants[0].size;
      this.activeSizeTab.set(firstSize);
    } else {
      // Si no hay variantes, crear una por defecto
      this.variants.set([
        {
          id: crypto.randomUUID(), // ✅ UUID válido
          size: 'S',
          color: 'Negro',
          stock: product.stock || 0,
          barcode: '',
        },
      ]);
      this.activeSizeTab.set('S');
    }

    this.activeModalTab.set('INFO');
    this.isDialogOpen.set(true);
  }

  /**
   * Resetear el formulario a valores iniciales
   */
  private resetForm() {
    this.productName.set('');
    this.productBrand.set('');
    this.productBarcode.set('');
    this.productCategory.set('General');
    this.costPrice.set(0);
    this.salePrice.set(0);
    this.activeSizeTab.set('S');
    this.selectedImage.set(null);
    // Inicializar con una variante por defecto
    this.variants.set([
      {
        id: crypto.randomUUID(), // ✅ UUID válido
        size: 'S',
        color: 'Negro',
        stock: 0,
        barcode: '',
      },
    ]);
  }

  /**
   * Generar variantes por defecto basadas en tallas y colores seleccionados
   */
  /**
   * Agregar una nueva talla al producto
   */
  addSize(size: string) {
    const currentVariants = this.variants();
    // Verificar si ya existe alguna variante con esta talla
    const hasSizeAlready = currentVariants.some((v) => v.size === size);

    if (!hasSizeAlready) {
      // Agregar una variante con el primer color por defecto
      const newVariant: ProductVariant = {
        id: crypto.randomUUID(), // ✅ UUID válido
        size,
        color: 'Negro',
        stock: 0,
        barcode: '',
      };
      this.variants.set([...currentVariants, newVariant]);
    }

    // Cambiar a la talla que acabamos de agregar
    this.activeSizeTab.set(size);
  }

  /**
   * Eliminar todas las variantes de una talla
   */
  removeSize(size: string) {
    const currentVariants = this.variants();
    const filtered = currentVariants.filter((v) => v.size !== size);

    if (filtered.length === 0) {
      // Si se eliminan todas, mantener al menos una variante
      this.variants.set([
        {
          id: crypto.randomUUID(), // ✅ UUID válido
          size: 'S',
          color: 'Negro',
          stock: 0,
          barcode: '',
        },
      ]);
      this.activeSizeTab.set('S');
    } else {
      this.variants.set(filtered);
      // Si eliminamos la talla activa, cambiar a la primera disponible
      if (this.activeSizeTab() === size) {
        this.activeSizeTab.set(filtered[0].size);
      }
    }
  }

  /**
   * Agregar un color a la talla activa
   */
  addColorToActiveSize(color: string) {
    const activeSize = this.activeSizeTab();
    const currentVariants = this.variants();

    // Verificar si ya existe esta combinación
    const exists = currentVariants.some((v) => v.size === activeSize && v.color === color);

    if (!exists) {
      const newVariant: ProductVariant = {
        id: crypto.randomUUID(), // ✅ UUID válido
        size: activeSize,
        color,
        stock: 0,
        barcode: '',
      };
      this.variants.set([...currentVariants, newVariant]);
    }
  }

  /**
   * Eliminar un color de la talla activa
   */
  removeColorFromActiveSize(color: string) {
    const activeSize = this.activeSizeTab();
    const currentVariants = this.variants();

    // Filtrar la variante específica
    const filtered = currentVariants.filter((v) => !(v.size === activeSize && v.color === color));

    // Asegurar que cada talla tenga al menos un color
    const sizeVariants = filtered.filter((v) => v.size === activeSize);
    if (sizeVariants.length === 0) {
      // Mantener al menos una variante para esta talla
      return;
    }

    this.variants.set(filtered);
  }

  /**
   * Toggle color para la talla activa
   */
  toggleColorForActiveSize(color: string) {
    const activeSize = this.activeSizeTab();
    const hasColor = this.activeColors().includes(color);

    if (hasColor) {
      this.removeColorFromActiveSize(color);
    } else {
      this.addColorToActiveSize(color);
    }
  }

  /**
   * Actualizar stock de una variante específica
   */
  updateVariantStock(variantId: string, stock: number) {
    const updated = this.variants().map((v) =>
      v.id === variantId ? { ...v, stock: Math.max(0, stock) } : v
    );
    this.variants.set(updated);
  }

  /**
   * Toggle expandir/contraer variantes de un producto
   */
  toggleProductVariants(productId: string) {
    this.expandedProductId.set(this.expandedProductId() === productId ? null : productId);
  }

  /**
   * Toggle expandir/contraer fila de tabla para ver variantes
   */
  toggleTableRow(productId: string) {
    this.expandedTableProductId.set(this.expandedTableProductId() === productId ? null : productId);
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      // Guardar archivo para subir después
      this.selectedFile.set(file);

      // Mostrar preview local
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedImage.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async saveProduct() {
    if (!this.isFormValid()) {
      alert('Por favor completa todos los campos correctamente y asigna stock a las variantes');
      return;
    }

    const editingId = this.editingProductId();
    const totalStock = this.totalStock();
    const allVariants = this.variants();

    // Extraer tallas y colores únicos de las variantes
    const uniqueSizes = Array.from(new Set(allVariants.map((v) => v.size)));
    const uniqueColors = Array.from(new Set(allVariants.map((v) => v.color)));

    // 🖼️ Subir imagen a Cloudinary si hay un archivo nuevo
    let imageUrl = this.selectedImage();
    const file = this.selectedFile();

    if (file && this.cloudinary.isConfigured()) {
      try {
        this.isUploadingImage.set(true);
        console.log('📤 Subiendo imagen a Cloudinary...');

        const publicId = editingId || `producto-${Date.now()}`;
        const result = await this.cloudinary.uploadImage(file, publicId, (progress) =>
          this.uploadProgress.set(progress.percentage)
        );

        imageUrl = result.url;
        console.log('✅ Imagen subida:', imageUrl);
      } catch (error) {
        console.error('❌ Error subiendo imagen:', error);
        alert('Error al subir la imagen. Se guardará sin imagen.');
        imageUrl = '/images/placeholder-product.svg';
      } finally {
        this.isUploadingImage.set(false);
        this.uploadProgress.set(0);
      }
    }

    if (editingId) {
      // Actualizar producto existente
      const success = this.productService.updateProduct(editingId, {
        name: this.productName(),
        brand: this.productBrand(),
        barcode: this.productBarcode(),
        category: this.productCategory(),
        price: this.salePrice(),
        cost: this.costPrice(),
        stock: totalStock,
        sizes: uniqueSizes,
        colors: uniqueColors,
        variants: allVariants,
        image: imageUrl || undefined,
      });

      if (success) {
        this.isDialogOpen.set(false);
        this.resetForm();
      }
    } else {
      // Crear nuevo producto
      const newProduct = {
        name: this.productName(),
        category: this.productCategory(),
        brand: this.productBrand() || 'DENFAR',
        price: this.salePrice(),
        cost: this.costPrice(),
        stock: totalStock,
        minStock: 5,
        sizes: uniqueSizes,
        colors: uniqueColors,
        variants: allVariants,
        barcode: this.productBarcode() || `BAR-${Date.now()}`,
        image: imageUrl || '/images/placeholder-product.svg',
        status: 'active' as const,
      };

      this.productService.addProduct(newProduct);
      this.isDialogOpen.set(false);
      this.resetForm();
    }
  }

  async handleAction(action: string, id: string) {
    if (action === 'delete') {
      if (
        confirm(
          '¿Archivar este producto? No se eliminará si tiene ventas asociadas, solo se ocultará del inventario.'
        )
      ) {
        const success = await this.productService.deleteProduct(id);
        if (!success) {
          alert('Error al archivar el producto. Por favor, intente nuevamente.');
        }
      }
    }
  }

  // Helpers para actualizar valores del formulario
  updateCost(val: string) {
    this.costPrice.set(parseFloat(val) || 0);
  }

  updateSale(val: string) {
    this.salePrice.set(parseFloat(val) || 0);
  }

  updateName(val: string) {
    this.productName.set(val);
  }

  updateCategory(val: string) {
    this.productCategory.set(val);
  }

  /**
   * Obtener variantes de una talla específica
   */
  getVariantsBySize(size: string): ProductVariant[] {
    return this.variants().filter((v) => v.size === size);
  }

  /**
   * Contar variantes de una talla específica
   */
  countVariantsBySize(size: string): number {
    return this.variants().filter((v) => v.size === size).length;
  }

  /**
   * Contar productos por categoría
   */
  countProductsByCategory(category: string): number {
    return this.products().filter((p) => p.category === category).length;
  }

  /**
   * Obtener icono Material para una categoría
   */
  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      General: 'inventory_2',
      Casacas: 'checkroom',
      Pantalones: 'straighten',
      Polos: 'dry_cleaning',
      Jeans: 'style',
      Accesorios: 'diamond',
      Calzado: 'steps'
    };
    return icons[category] || 'category';
  }

 
}
