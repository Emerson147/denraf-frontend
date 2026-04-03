import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ComparisonData {
  current: number[];
  previous: number[];
  labels: string[];
}

@Component({
  selector: 'app-ui-comparison-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-full relative" [style.height]="height">
      
      <svg class="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <!-- Gradientes para las líneas -->
          <linearGradient id="currentGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#0f766e" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#0f766e" stop-opacity="0"/>
          </linearGradient>
          
          <linearGradient id="previousGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#78716c" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#78716c" stop-opacity="0"/>
          </linearGradient>

          <filter id="softGlow">
            <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Grid lines -->
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

        <!-- Área de relleno - Período Anterior (atrás) -->
        <path 
          [attr.d]="previousFillPath()" 
          fill="url(#previousGradient)" 
          style="animation: fadeIn 1s ease-out"
        />

        <!-- Área de relleno - Período Actual (adelante) -->
        <path 
          [attr.d]="currentFillPath()" 
          fill="url(#currentGradient)" 
          style="animation: fadeIn 1.2s ease-out"
        />
        
        <!-- Línea - Período Anterior -->
        <path 
          [attr.d]="previousLinePath()" 
          fill="none" 
          stroke="#78716c" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          stroke-dasharray="4,4"
          opacity="0.6"
          class="transition-all duration-700"
        />
        
        <!-- Línea - Período Actual -->
        <path 
          [attr.d]="currentLinePath()" 
          fill="none" 
          stroke="#0f766e" 
          stroke-width="2.5" 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          filter="url(#softGlow)"
          class="transition-all duration-700"
          style="stroke-dasharray: 300; stroke-dashoffset: 300; animation: drawLine 1.5s ease-out forwards"
        />
        
        <!-- Puntos - Período Actual -->
        @for (point of currentPoints(); track $index) {
          <g>
            <circle 
              [attr.cx]="point.x" 
              [attr.cy]="point.y" 
              r="6" 
              fill="#0f766e" 
              opacity="0"
              class="hover:opacity-20 transition-opacity duration-300"
              (mouseenter)="hoveredIndex.set($index); hoveredType.set('current')"
              (mouseleave)="hoveredIndex.set(null)"
            />
            
            <circle 
              [attr.cx]="point.x" 
              [attr.cy]="point.y" 
              [attr.r]="hoveredIndex() === $index && hoveredType() === 'current' ? 4 : 2.5"
              fill="white" 
              stroke="#0f766e" 
              stroke-width="2"
              class="transition-all duration-300 cursor-pointer drop-shadow-md"
              (mouseenter)="hoveredIndex.set($index); hoveredType.set('current')"
              (mouseleave)="hoveredIndex.set(null)"
              style="animation: popIn 0.4s ease-out {{ $index * 0.1 }}s backwards"
            />
          </g>
        }

        <!-- Puntos - Período Anterior (más discretos) -->
        @for (point of previousPoints(); track $index) {
          <circle 
            [attr.cx]="point.x" 
            [attr.cy]="point.y" 
            r="2"
            fill="#78716c" 
            opacity="0.5"
            class="cursor-pointer hover:opacity-100 transition-opacity duration-300"
            (mouseenter)="hoveredIndex.set($index); hoveredType.set('previous')"
            (mouseleave)="hoveredIndex.set(null)"
          />
        }
      </svg>

      <!-- Tooltip -->
      @if (hoveredIndex() !== null && hoveredType()) {
        <div 
          class="absolute bg-stone-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-xl pointer-events-none z-10"
          [style.left.%]="hoveredType() === 'current' ? currentPoints()[hoveredIndex()!].x : previousPoints()[hoveredIndex()!].x"
          [style.top.%]="hoveredType() === 'current' ? currentPoints()[hoveredIndex()!].y - 15 : previousPoints()[hoveredIndex()!].y - 15"
          style="transform: translate(-50%, -100%); animation: tooltipFade 0.2s ease-out"
        >
          <div class="space-y-1">
            @if (hoveredType() === 'current') {
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span class="text-emerald-400 font-bold">Esta semana: S/ {{ data.current[hoveredIndex()!] | number:'1.0-0' }}</span>
              </div>
            }
            @if (hoveredType() === 'previous') {
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-stone-400"></div>
                <span class="text-stone-400 font-bold">Semana anterior: S/ {{ data.previous[hoveredIndex()!] | number:'1.0-0' }}</span>
              </div>
            }
            @if (data.labels[hoveredIndex()!]) {
              <p class="text-stone-400 text-xs">{{ data.labels[hoveredIndex()!] }}</p>
            }
          </div>
          <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-stone-900"></div>
        </div>
      }

      <!-- Leyenda -->
      <div class="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-6 pb-2">
        <div class="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-stone-200">
          <div class="w-3 h-0.5 bg-emerald-600 rounded-full"></div>
          <span class="text-xs font-medium text-stone-700">Esta semana</span>
        </div>
        <div class="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-stone-200">
          <div class="w-3 h-0.5 bg-stone-500 rounded-full" style="background-image: repeating-linear-gradient(90deg, #78716c 0, #78716c 3px, transparent 3px, transparent 6px);"></div>
          <span class="text-xs font-medium text-stone-700">Semana anterior</span>
        </div>
      </div>

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
export class UiComparisonChartComponent {
  @Input() data: ComparisonData = {
    current: [],
    previous: [],
    labels: []
  };
  @Input() height = '240px';
  
  hoveredIndex = signal<number | null>(null);
  hoveredType = signal<'current' | 'previous' | null>(null);

  // Normalización de puntos para período actual
  currentPoints = computed(() => {
    const allValues = [...this.data.current, ...this.data.previous];
    const max = Math.max(...allValues, 1);
    const min = Math.min(...allValues, 0);
    const range = max - min || 1;

    return this.data.current.map((val, i) => ({
      x: (i / (this.data.current.length - 1)) * 100,
      y: 100 - ((val - min) / range) * 70 - 15
    }));
  });

  // Normalización de puntos para período anterior
  previousPoints = computed(() => {
    const allValues = [...this.data.current, ...this.data.previous];
    const max = Math.max(...allValues, 1);
    const min = Math.min(...allValues, 0);
    const range = max - min || 1;

    return this.data.previous.map((val, i) => ({
      x: (i / (this.data.previous.length - 1)) * 100,
      y: 100 - ((val - min) / range) * 70 - 15
    }));
  });

  // Línea suave para período actual
  currentLinePath = computed(() => {
    const points = this.currentPoints();
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const controlX = (current.x + next.x) / 2;
      
      path += ` Q ${controlX},${current.y} ${controlX},${(current.y + next.y) / 2}`;
      path += ` Q ${controlX},${next.y} ${next.x},${next.y}`;
    }
    
    return path;
  });

  // Línea suave para período anterior
  previousLinePath = computed(() => {
    const points = this.previousPoints();
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const controlX = (current.x + next.x) / 2;
      
      path += ` Q ${controlX},${current.y} ${controlX},${(current.y + next.y) / 2}`;
      path += ` Q ${controlX},${next.y} ${next.x},${next.y}`;
    }
    
    return path;
  });

  // Área de relleno para período actual
  currentFillPath = computed(() => {
    const line = this.currentLinePath();
    if (!line) return '';
    return `${line} L 100,100 L 0,100 Z`;
  });

  // Área de relleno para período anterior
  previousFillPath = computed(() => {
    const line = this.previousLinePath();
    if (!line) return '';
    return `${line} L 100,100 L 0,100 Z`;
  });
}
