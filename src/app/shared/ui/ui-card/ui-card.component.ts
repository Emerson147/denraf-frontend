import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../utils/cn'; // Tu utilidad maestra

@Component({
  selector: 'app-ui-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="computedClass">
      @if (title) {
        <div class="flex flex-col space-y-1.5 p-6 pb-2">
          <h3 class="text-lg font-semibold leading-none tracking-tight">{{ title }}</h3>
          @if (description) {
            <p class="text-sm text-muted-foreground">{{ description }}</p>
          }
        </div>
      }

      <div class="p-6 pt-0" [class.pt-6]="!title">
        <ng-content></ng-content>
      </div>
      
      @if (footer) {
        <div class="flex items-center p-6 pt-0">
          <ng-content select="[footer]"></ng-content>
        </div>
      }
    </div>
  `
})
export class UiCardComponent {
  @Input() title?: string;
  @Input() description?: string;
  @Input() footer?: boolean;
  @Input() class: string = '';

  get computedClass() {
  return cn(
    // Antes: border border-border ...
    // AHORA: Borde muy sutil (stone-100), fondo blanco, sombra difusa al hacer hover
    'rounded-[2rem] border border-stone-100 bg-white text-stone-800 shadow-sm transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
    this.class
  );
}
}