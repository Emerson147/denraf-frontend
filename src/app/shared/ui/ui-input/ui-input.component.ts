import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { cn } from '../../utils/cn';

@Component({
  selector: 'app-ui-input',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiInputComponent),
      multi: true
    }
  ],
  template: `
    <input
      [type]="type"
      [placeholder]="placeholder"
      [class]="computedClass"
      [value]="value"
      [disabled]="disabled"
      (input)="onInput($event)"
      (blur)="onBlur()"
    />
  `,
})
export class UiInputComponent implements ControlValueAccessor {
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() value: string | number = '';
  @Input() disabled = false;
  @Input() class = '';

  @Output() valueChange = new EventEmitter<string>();

  onChange: any = () => {};
  onTouched: any = () => {};

  get computedClass() {
    return cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      this.class
    );
  }

  onInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.value = val;
    this.onChange(val);
    this.valueChange.emit(val);
  }

  onBlur() {
    this.onTouched();
  }

  writeValue(value: any): void {
    this.value = value !== undefined && value !== null ? value : '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
