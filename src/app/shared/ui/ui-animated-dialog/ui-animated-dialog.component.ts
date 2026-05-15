import { Component, Input, Output, EventEmitter, signal, DestroyRef, inject, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-ui-animated-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showModal()) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center px-4">
        <div
          class="fixed inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-md transition-all duration-400 ease-out"
          [class.opacity-0]="!animateIn()"
          [class.opacity-100]="animateIn()"
          (click)="close()"
        ></div>

        <div
          class="relative z-10 w-full max-h-[90vh] flex flex-col transform rounded-4xl bg-white dark:bg-stone-900 shadow-2xl border border-stone-100/50 dark:border-stone-800/50 transition-all duration-400 ease-spring"
          [class.max-w-md]="maxWidth === 'sm'"
          [class.max-w-2xl]="maxWidth === 'md'"
          [class.max-w-4xl]="maxWidth === 'lg'"
          [style.transform-origin]="transformOrigin()"
          [class.scale-90]="!animateIn()"
          [class.opacity-0]="!animateIn()"
          [class.translate-y-8]="!animateIn()"
          [class.scale-100]="animateIn()"
          [class.opacity-100]="animateIn()"
          [class.translate-y-0]="animateIn()"
          (click)="$event.stopPropagation()"
        >
          <div class="overflow-y-auto no-scrollbar flex-1 p-8 pb-4">
            <ng-content></ng-content>
          </div>

          <button
            (click)="close()"
            class="absolute top-6 right-6 p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-800 transition-colors z-10"
          >
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      /* Aseguramos que el host no interfiera */
      :host {
        display: contents;
      }
    `,
  ],
})
export class UiAnimatedDialogComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private document = inject(DOCUMENT);
  private el = inject(ElementRef);
  private activeTimeouts: number[] = [];

  @Input() trigger: HTMLElement | null = null;
  @Input() maxWidth: 'sm' | 'md' | 'lg' = 'lg';
  transformOrigin = signal('center center');

  @Input() set isOpen(value: boolean) {
    if (value) {
      // CALCULAR ORIGEN DE LA ANIMACIÓN
      if (this.trigger) {
        const rect = this.trigger.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculamos la posición relativa a la ventana (viewport)
        // Como el diálogo está fixed inset-0, las coordenadas del viewport funcionan directo
        this.transformOrigin.set(`${centerX}px ${centerY}px`);
      } else {
        this.transformOrigin.set('center center');
      }

      // AL ABRIR:
      // 1. Lo creamos en el DOM (showModal = true)
      this.showModal.set(true);
      this.document.body.classList.add('dialog-open');
      // 2. Un tick después, iniciamos la animación de entrada (animateIn = true)
      const openTimeoutId = setTimeout(() => this.animateIn.set(true), 10) as unknown as number;
      this.activeTimeouts.push(openTimeoutId);
    } else {
      // AL CERRAR:
      // 1. Iniciamos animación de salida (animateIn = false)
      this.animateIn.set(false);
      this.document.body.classList.remove('dialog-open');
      // 2. Esperamos a que termine la animación (400ms) y lo sacamos del DOM
      const closeTimeoutId = setTimeout(() => this.showModal.set(false), 400) as unknown as number;
      this.activeTimeouts.push(closeTimeoutId);
    }
  }
  @Output() isOpenChange = new EventEmitter<boolean>();

  // Signals internas para orquestar la animación
  showModal = signal(false); // Controla el @if (existencia en DOM)
  animateIn = signal(false); // Controla las clases CSS (estado visual)

  ngOnInit() {
    // Mover el componente al final del body para escapar de cualquier stacking context (ej. view-transitions o sidebars)
    this.document.body.appendChild(this.el.nativeElement);
  }

  ngOnDestroy() {
    this.document.body.classList.remove('dialog-open');
    // Limpiar el DOM al destruir el componente
    if (this.el.nativeElement && this.el.nativeElement.parentNode) {
      this.el.nativeElement.parentNode.removeChild(this.el.nativeElement);
    }
  }

  close() {
    this.isOpenChange.emit(false);
  }

  constructor() {
    // 🧹 Cleanup automático de todos los timeouts de animación
    this.destroyRef.onDestroy(() => {
      this.activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      this.activeTimeouts = [];
    });
  }
}
