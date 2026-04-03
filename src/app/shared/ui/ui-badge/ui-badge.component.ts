import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../utils/cn';

@Component({
  selector: 'app-ui-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="computedClass">
      <ng-content></ng-content>
    </div>
  `
})
export class UiBadgeComponent {
  @Input() variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' = 'default';
  @Input() class = '';

  get computedClass() {
    return cn(
      // Base: Pastilla redondeada, texto pequeño, negrita
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      
      // Variantes
      this.variant === 'default' && 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
      this.variant === 'secondary' && 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
      this.variant === 'destructive' && 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
      this.variant === 'success' && 'border-transparent bg-emerald-500 text-white hover:bg-emerald-600', // Agregamos verde para dinero/éxito
      this.variant === 'outline' && 'text-foreground',
      
      this.class
    );
  }
}