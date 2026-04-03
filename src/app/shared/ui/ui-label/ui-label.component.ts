import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../utils/cn';

@Component({
  selector: 'app-ui-label',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label
      [class]="computedClass"
      (click)="onClick($event)"
    >
      <ng-content></ng-content>
    </label>
  `
})
export class UiLabelComponent {
  @Input() class = '';
  @Input() error = false; // Para cuando haya errores de validación

  get computedClass() {
    return cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      this.error ? 'text-destructive' : 'text-foreground', // Rojo si hay error
      this.class
    );
  }

  onClick(event: Event) {
    // Lógica opcional si necesitas prevenir clicks
  }
}