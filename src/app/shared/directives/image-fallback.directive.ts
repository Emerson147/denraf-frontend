import { Directive, ElementRef, HostListener, Input, OnInit } from '@angular/core';

/**
 * 🖼️ Directiva para manejo automático de errores de imagen
 * 
 * Uso:
 * <img [src]="product.image" appImageFallback>
 * <img [src]="product.image" appImageFallback="/custom-placeholder.png">
 * 
 * Características:
 * - Auto-reemplazo con placeholder si falla la carga
 * - Lazy loading automático
 * - Soporte para placeholder personalizado
 * - Previene bucles infinitos de error
 */
@Directive({
  selector: '[appImageFallback]',
  standalone: true,
})
export class ImageFallbackDirective implements OnInit {
  @Input() appImageFallback = '/images/placeholder-product.svg';
  
  private hasError = false;

  constructor(private el: ElementRef<HTMLImageElement>) {}

  ngOnInit(): void {
    // Activar lazy loading
    this.el.nativeElement.loading = 'lazy';
    
    // Si no hay src inicial, usar placeholder
    if (!this.el.nativeElement.src || this.el.nativeElement.src.trim() === '') {
      this.useFallback();
    }
  }

  @HostListener('error')
  onError(): void {
    // Evitar bucle infinito si el placeholder también falla
    if (this.hasError) {
      console.warn('⚠️ Placeholder también falló, usando imagen inline');
      this.useInlinePlaceholder();
      return;
    }

    console.warn('⚠️ Error cargando imagen:', this.el.nativeElement.src);
    this.useFallback();
  }

  private useFallback(): void {
    this.hasError = true;
    this.el.nativeElement.src = this.appImageFallback;
  }

  private useInlinePlaceholder(): void {
    // SVG inline como último recurso
    this.el.nativeElement.src = `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#f3f4f6"/>
        <text x="100" y="100" font-family="Arial" font-size="14" fill="#9ca3af" 
              text-anchor="middle" dominant-baseline="middle">Sin Imagen</text>
      </svg>
    `)}`;
  }
}
