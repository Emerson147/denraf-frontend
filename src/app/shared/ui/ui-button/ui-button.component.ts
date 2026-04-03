import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../utils/cn'; // Asegúrate que la ruta sea correcta

@Component({
  selector: 'app-ui-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [class]="classes" [disabled]="disabled" (click)="onClick.emit($event)">
      <ng-content></ng-content>
    </button>
  `,
})
export class UiButtonComponent {
  @Input() variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' =
    'default';
  @Input() size: 'default' | 'sm' | 'lg' | 'icon' = 'default';
  @Input() class = '';
  @Input() disabled = false;

  @Output() onClick = new EventEmitter<Event>();

  get classes() {
    return cn(
      // Base
      'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',

      // Variantes (Colores definidos en tu styles.css)
      this.variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
      this.variant === 'destructive' &&
        'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      this.variant === 'outline' &&
        'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      this.variant === 'secondary' &&
        'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      this.variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
      this.variant === 'link' && 'text-primary underline-offset-4 hover:underline',

      // Tamaños
      this.size === 'default' && 'h-10 px-4 py-2',
      this.size === 'sm' && 'h-9 rounded-md px-3',
      this.size === 'lg' && 'h-11 rounded-md px-8',
      this.size === 'icon' && 'h-10 w-10',

      // Clases extra que tú le pases
      this.class
    );
  }
}
