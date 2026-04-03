import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-full relative" [style.height]="height">
      
      <svg class="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <!-- Gradiente mejorado con colores zen -->
          <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#0f766e" stop-opacity="0.15"/>
            <stop offset="50%" stop-color="#0f766e" stop-opacity="0.05"/>
            <stop offset="100%" stop-color="#0f766e" stop-opacity="0"/>
          </linearGradient>
          
          <!-- Filtro de sombra suave -->
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Grid lines (líneas de guía horizontales) -->
        @for (line of [25, 50, 75]; track line) {
          <line 
            [attr.x1]="0" 
            [attr.y1]="line" 
            [attr.x2]="100" 
            [attr.y2]="line" 
            stroke="#e7e5e4" 
            stroke-width="0.3" 
            stroke-dasharray="2,3"
            opacity="0.6"
          />
        }
        
        <!-- Área de relleno con gradiente -->
        <path 
          [attr.d]="fillPath()" 
          fill="url(#chartGradient)" 
          class="animate-fade-in"
          style="animation: fadeIn 1.2s ease-out"
        />
        
        <!-- Línea principal con curvas suaves -->
        <path 
          [attr.d]="smoothLinePath()" 
          fill="none" 
          stroke="#0f766e" 
          stroke-width="2.5" 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          filter="url(#softGlow)"
          class="transition-all duration-700 ease-out"
          style="stroke-dasharray: 300; stroke-dashoffset: 300; animation: drawLine 1.5s ease-out forwards"
        />
        
        <!-- Puntos de datos interactivos -->
        @for (point of normalizedPoints(); track $index) {
          <g>
            <!-- Círculo exterior (halo en hover) -->
            <circle 
              [attr.cx]="point.x" 
              [attr.cy]="point.y" 
              r="6" 
              fill="#0f766e" 
              opacity="0"
              class="hover:opacity-20 transition-opacity duration-300"
              (mouseenter)="hoveredIndex.set($index)"
              (mouseleave)="hoveredIndex.set(null)"
            />
            
            <!-- Punto principal -->
            <circle 
              [attr.cx]="point.x" 
              [attr.cy]="point.y" 
              [attr.r]="hoveredIndex() === $index ? 4 : 2.5"
              fill="white" 
              stroke="#0f766e" 
              stroke-width="2"
              class="transition-all duration-300 cursor-pointer drop-shadow-md"
              (mouseenter)="hoveredIndex.set($index)"
              (mouseleave)="hoveredIndex.set(null)"
              style="animation: popIn 0.4s ease-out {{ $index * 0.1 }}s backwards"
            >
              <title>S/ {{ data[$index] }}</title>
            </circle>
          </g>
        }
      </svg>

      <!-- Tooltip flotante -->
      @if (hoveredIndex() !== null) {
        <div 
          class="absolute bg-stone-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-xl pointer-events-none z-10"
          [style.left.%]="normalizedPoints()[hoveredIndex()!].x"
          [style.top.%]="normalizedPoints()[hoveredIndex()!].y - 15"
          style="transform: translate(-50%, -100%); animation: tooltipFade 0.2s ease-out"
        >
          <div class="flex items-center gap-2">
            <span class="text-emerald-400 font-bold">S/ {{ data[hoveredIndex()!] | number:'1.0-0' }}</span>
          </div>
          <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-stone-900"></div>
        </div>
      }

    </div>

    <style>
      @keyframes drawLine {
        to {
          stroke-dashoffset: 0;
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes popIn {
        from {
          transform: scale(0);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }

      @keyframes tooltipFade {
        from {
          opacity: 0;
          transform: translate(-50%, -100%) translateY(5px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -100%) translateY(0);
        }
      }
    </style>
  `
})
export class UiChartComponent {
  @Input() data: number[] = [];
  @Input() height = '200px';
  
  hoveredIndex = signal<number | null>(null);

  // Normalización de puntos
  normalizedPoints = computed(() => {
    const max = Math.max(...this.data, 1);
    const min = Math.min(...this.data, 0);
    const range = max - min || 1;

    return this.data.map((val, i) => ({
      x: (i / (this.data.length - 1)) * 100,
      y: 100 - ((val - min) / range) * 75 - 12.5 // Margen arriba/abajo
    }));
  });

  // Línea con curvas suaves (Catmull-Rom)
  smoothLinePath = computed(() => {
    const points = this.normalizedPoints();
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const controlX = (current.x + next.x) / 2;
      
      // Curva cuadrática para suavidad
      path += ` Q ${controlX},${current.y} ${controlX},${(current.y + next.y) / 2}`;
      path += ` Q ${controlX},${next.y} ${next.x},${next.y}`;
    }
    
    return path;
  });

  // Relleno del área
  fillPath = computed(() => {
    const line = this.smoothLinePath();
    if (!line) return '';
    return `${line} L 100,100 L 0,100 Z`;
  });
}