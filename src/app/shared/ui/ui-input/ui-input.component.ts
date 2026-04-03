import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../utils/cn';

@Component({
  selector: 'app-ui-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <input
      [type]="type"
      [placeholder]="placeholder"
      [class]="computedClass"
      [value]="value"
      [disabled]="disabled"
      (input)="onInput($event)"
    />
  `,
})
export class UiInputComponent {
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() value: string | number = '';
  @Input() disabled = false;
  @Input() class = '';

  // Emitimos el valor al escribir para que puedas filtrar luego
  @Output() valueChange = new EventEmitter<string>();

  get computedClass() {
    return cn(
      // Estilos base Shadcn: Altura h-10, bordes finos, fondo transparente
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      this.class
    );
  }

  onInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.valueChange.emit(val);
  }
}
