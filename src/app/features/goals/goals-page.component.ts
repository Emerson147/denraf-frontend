import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GamificationService } from '../../core/services/gamification.service';
import { ThemeService } from '../../core/theme/theme.service';
import { BackendAuthService } from '../../core/services/backend-auth.service';
import { UiPageHeaderComponent } from '../../shared/ui/ui-page-header/ui-page-header.component';

@Component({
  selector: 'app-goals-page',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, UiPageHeaderComponent],
  template: `
    <div
      class="min-h-screen bg-stone-50 dark:bg-stone-950 p-4 sm:p-6 lg:p-8 transition-colors duration-300 ease-out"
    >
      <div class="w-full space-y-6">
        <!-- ══════════════════════════════════════════ -->
        <!-- HEADER (shared component)                  -->
        <!-- ══════════════════════════════════════════ -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <app-ui-page-header
            title="Metas y logros"
            [subtitle]="'DenRaf · Desempeño de ' + (currentUser()?.nombre ?? 'Usuario')"
            materialIcon="emoji_events"
          />
          <!-- Racha badge -->
          <div
            class="px-4 py-2 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 flex items-center gap-2 shadow-sm"
          >
            <span
              class="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest"
              >Racha</span
            >
            <div
              class="flex items-center gap-1"
              [class.text-orange-500]="gamification.stats().currentStreak > 0"
              [class.text-stone-400]="gamification.stats().currentStreak === 0"
            >
              <span class="material-symbols-outlined text-sm">local_fire_department</span>
              <span class="font-bold text-sm">{{ gamification.stats().currentStreak }} días</span>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════ -->
        <!-- ROW 1 — 4 KPI Pills (ZEN ENTERPRISE)       -->
        <!-- ══════════════════════════════════════════ -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <!-- Nivel actual -->
          <div
            class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border border-stone-200/60 dark:border-stone-800 rounded-3xl p-5 flex items-center gap-4 hover:border-stone-300 dark:hover:border-stone-700 transition-colors shadow-sm group"
          >
            <div
              class="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-400 group-hover:scale-105 transition-transform shrink-0"
            >
              <span class="material-symbols-outlined text-xl">military_tech</span>
            </div>
            <div class="flex-1 min-w-0">
              <p
                class="text-[10px] uppercase tracking-widest font-black text-stone-500 dark:text-stone-400 truncate"
              >
                Nivel actual
              </p>
              <p
                class="text-2xl font-black text-stone-900 dark:text-stone-100 mt-0.5 tracking-tight leading-none mb-1.5"
              >
                {{ gamification.currentLevel() }}
              </p>
              <div class="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                <div
                  class="h-full bg-stone-900 dark:bg-stone-200 rounded-full transition-all duration-1000"
                  [style.width.%]="levelProgress()"
                ></div>
              </div>
            </div>
          </div>

          <!-- Puntos totales -->
          <div
            class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border border-stone-200/60 dark:border-stone-800 rounded-3xl p-5 flex items-center gap-4 hover:border-stone-300 dark:hover:border-stone-700 transition-colors shadow-sm group"
          >
            <div
              class="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-400 group-hover:scale-105 transition-transform shrink-0"
            >
              <span class="material-symbols-outlined text-xl">stars</span>
            </div>
            <div class="flex-1 min-w-0">
              <p
                class="text-[10px] uppercase tracking-widest font-black text-stone-500 dark:text-stone-400 truncate"
              >
                Puntos totales
              </p>
              <p
                class="text-2xl font-black text-stone-900 dark:text-stone-100 mt-0.5 tracking-tight leading-none truncate"
              >
                {{ gamification.stats().totalPoints | number }}
              </p>
            </div>
          </div>

          <!-- Racha activa -->
          <div
            class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border border-stone-200/60 dark:border-stone-800 rounded-3xl p-5 flex items-center gap-4 hover:border-stone-300 dark:hover:border-stone-700 transition-colors shadow-sm group"
          >
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors group-hover:scale-105 shrink-0"
              [class.bg-stone-900]="gamification.stats().currentStreak > 0"
              [class.text-white]="gamification.stats().currentStreak > 0"
              [class.bg-stone-100]="gamification.stats().currentStreak === 0"
              [class.dark:bg-stone-800]="gamification.stats().currentStreak === 0"
              [class.text-stone-400]="gamification.stats().currentStreak === 0"
            >
              <span class="material-symbols-outlined text-xl">local_fire_department</span>
            </div>
            <div class="min-w-0">
              <p
                class="text-[10px] uppercase tracking-widest font-black truncate"
                [class.text-stone-900]="gamification.stats().currentStreak > 0"
                [class.dark:text-stone-100]="gamification.stats().currentStreak > 0"
                [class.text-stone-500]="gamification.stats().currentStreak === 0"
              >
                Racha activa
              </p>
              <p
                class="text-2xl font-black mt-0.5 tracking-tight leading-none"
                [class.text-stone-900]="gamification.stats().currentStreak > 0"
                [class.dark:text-stone-100]="gamification.stats().currentStreak > 0"
                [class.text-stone-400]="gamification.stats().currentStreak === 0"
              >
                {{ gamification.stats().currentStreak }}
              </p>
            </div>
          </div>

          <!-- Galardones -->
          <div
            class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border border-stone-200/60 dark:border-stone-800 rounded-3xl p-5 flex items-center gap-4 hover:border-stone-300 dark:hover:border-stone-700 transition-colors shadow-sm group"
          >
            <div
              class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 dark:text-amber-400 group-hover:scale-105 transition-transform shrink-0"
            >
              <span class="material-symbols-outlined text-xl">emoji_events</span>
            </div>
            <div class="min-w-0">
              <p
                class="text-[10px] uppercase tracking-widest font-black text-amber-600/80 dark:text-amber-500 truncate"
              >
                Galardones
              </p>
              <p
                class="text-2xl font-black text-stone-900 dark:text-stone-100 mt-0.5 tracking-tight leading-none truncate"
              >
                {{ unlockedAchievements()
                }}<span class="text-sm text-stone-400"
                  >/{{ gamification.allAchievements().length }}</span
                >
              </p>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════ -->
        <!-- ROW 2 — Hero dark nivel (4/12) + Metas activas (8/12)    -->
        <!-- Mismo patrón que "Ingresos Totales" + chart de Reportes  -->
        <!-- ══════════════════════════════════════════════════════════ -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- HERO DARK: Nivel y progreso -->
          <div
            class="lg:col-span-4 bg-stone-900 rounded-3xl p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden group"
          >
            <div
              class="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700"
            >
              <span class="material-symbols-outlined text-[150px] text-white">military_tech</span>
            </div>
            <div class="relative z-10">
              <div class="flex items-center gap-2 text-stone-400 mb-2">
                <span class="material-symbols-outlined text-sm">stars</span>
                <span class="text-xs uppercase tracking-widest font-semibold">
                  Nivel {{ gamification.currentLevel() }}
                </span>
              </div>
              <p class="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                {{ gamification.stats().totalPoints | number }}
              </p>
              <p class="text-stone-400 text-sm mt-1">puntos acumulados</p>
            </div>
            <div class="relative z-10 mt-6 pt-6 border-t border-white/10 space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-stone-400">Al nivel {{ gamification.currentLevel() + 1 }}</span>
                <span class="font-bold text-white">{{ levelProgress() | number: '1.0-0' }}%</span>
              </div>
              <div class="w-full h-1.5 bg-stone-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-white rounded-full transition-all duration-1000"
                  [style.width.%]="levelProgress()"
                ></div>
              </div>
              <p class="text-xs text-stone-400">
                Faltan
                <span class="text-white font-semibold"
                  >{{ gamification.pointsToNextLevel() }} pts</span
                >
                para subir
              </p>
            </div>
          </div>

          <!-- METAS ACTIVAS -->
          <div
            class="lg:col-span-8 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/60 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col"
          >
            <!-- Header de la card -->
            <div
              class="p-6 lg:p-8 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0"
            >
              <div>
                <h2 class="text-lg font-bold text-stone-900 dark:text-stone-100">Metas activas</h2>
                <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Seguimiento en tiempo real
                </p>
              </div>
              <div class="flex items-center gap-3">
                @if (isAdmin) {
                  <button
                    (click)="openGoalModal()"
                    class="px-3 py-1.5 flex items-center gap-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-[11px] font-bold rounded-lg hover:scale-105 transition-transform shadow-sm"
                  >
                    <span class="material-symbols-outlined text-[14px]">add</span>
                    Nueva Meta
                  </button>
                }
                <span
                  class="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-[11px] rounded-lg font-bold"
                >
                  {{ gamification.activeGoals().length }} metas
                </span>
              </div>
            </div>

            <!-- Lista de metas con divide-y -->
            <div class="divide-y divide-stone-100 dark:divide-stone-800 flex-1">
              @for (goal of gamification.activeGoals(); track goal.id) {
                <div
                  class="relative p-6 lg:px-8 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors overflow-hidden group"
                >
                  @if (
                    goalProgress(goal.current, goal.target) >= 80 &&
                    goalProgress(goal.current, goal.target) < 100
                  ) {
                    <!-- Pulse effect for near-completion goals -->
                    <div
                      class="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/80 animate-pulse"
                    ></div>
                  }
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <h3 class="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {{ goal.title }}
                        </h3>
                        <span
                          class="text-[10px] font-medium text-stone-500 border border-stone-200 dark:border-stone-700 px-2 py-0.5 rounded-md"
                        >
                          {{ goalTypeLabel(goal.type) }}
                        </span>
                      </div>
                      <p class="text-[13px] text-stone-500 dark:text-stone-400 mb-3">
                        {{ goal.description }}
                      </p>
                      <div class="flex items-center gap-3">
                        <div
                          class="flex-1 h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden"
                        >
                          <div
                            class="h-full bg-emerald-500 rounded-full transition-all duration-700"
                            [style.width.%]="goalProgress(goal.current, goal.target)"
                          ></div>
                        </div>
                        <span
                          class="text-[13px] font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap"
                        >
                          {{ goal.current }} / {{ goal.target }}
                          <span class="text-stone-400 font-normal text-xs">{{
                            metricLabel(goal.metric)
                          }}</span>
                        </span>
                      </div>
                    </div>
                    <!-- Porcentaje grande a la derecha -->
                    <div class="shrink-0 text-right">
                      <p
                        class="text-2xl font-bold"
                        [class.text-emerald-600]="goalProgress(goal.current, goal.target) >= 80"
                        [class.dark:text-emerald-500]="
                          goalProgress(goal.current, goal.target) >= 80
                        "
                        [class.text-stone-900]="goalProgress(goal.current, goal.target) < 80"
                        [class.dark:text-stone-100]="goalProgress(goal.current, goal.target) < 80"
                      >
                        {{ goalProgress(goal.current, goal.target) | number: '1.0-0'
                        }}<span class="text-sm font-normal text-stone-400">%</span>
                      </p>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="p-12 flex flex-col items-center justify-center text-center">
                  <div
                    class="w-16 h-16 rounded-full bg-stone-50 dark:bg-stone-800 flex items-center justify-center mb-4"
                  >
                    <span
                      class="material-symbols-outlined text-3xl text-stone-300 dark:text-stone-600"
                      >flag</span
                    >
                  </div>
                  <h3 class="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Sin metas activas
                  </h3>
                  <p class="text-xs text-stone-500 mt-1 max-w-[200px]">
                    Tu historial de metas anteriores y próximas aparecerá aquí.
                  </p>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════ -->
        <!-- ROW 3 — Galardones (7/12) + Ranking dark (5/12)          -->
        <!-- Galardones: gap-px grid como sección interna de Reportes  -->
        <!-- Ranking: mismo lenguaje que "Ferias vs Tienda"            -->
        <!-- ══════════════════════════════════════════════════════════ -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- GALARDONES -->
          <div
            class="lg:col-span-7 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/60 dark:border-stone-800 shadow-sm overflow-hidden"
          >
            <div
              class="p-6 lg:p-8 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between"
            >
              <div>
                <h2 class="text-lg font-bold text-stone-900 dark:text-stone-100">Galardones</h2>
                <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Logros desbloqueados y pendientes
                </p>
              </div>
              <span
                class="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-xs rounded-full font-medium"
              >
                {{ unlockedAchievements() }} / {{ gamification.allAchievements().length }}
              </span>
            </div>
            <!-- Grid gap-px: misma técnica del bento interno de Reportes -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-stone-100 dark:bg-stone-800">
              @for (achievement of gamification.allAchievements(); track achievement.id) {
                <div
                  class="bg-white dark:bg-stone-900 p-5 flex items-center gap-4 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  [class.opacity-40]="!achievement.unlocked"
                >
                  <div
                    class="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors"
                    [class.bg-emerald-50]="achievement.unlocked"
                    [class.dark:bg-emerald-900/20]="achievement.unlocked"
                    [class.text-emerald-600]="achievement.unlocked"
                    [class.dark:text-emerald-400]="achievement.unlocked"
                    [class.bg-stone-100]="!achievement.unlocked"
                    [class.dark:bg-stone-800]="!achievement.unlocked"
                    [class.text-stone-300]="!achievement.unlocked"
                  >
                    <span class="material-symbols-outlined text-[20px]">{{
                      achievement.icon
                    }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-0.5">
                      <h3 class="text-[13px] font-bold text-stone-900 dark:text-stone-100 truncate">
                        {{ achievement.title }}
                      </h3>
                      <span
                        class="text-[11px] font-bold ml-2 shrink-0"
                        [class.text-emerald-600]="achievement.unlocked"
                        [class.dark:text-emerald-400]="achievement.unlocked"
                        [class.text-stone-400]="!achievement.unlocked"
                      >
                        +{{ achievement.points }}
                      </span>
                    </div>
                    <p class="text-[11px] text-stone-500 line-clamp-1 mb-2">
                      {{ achievement.description }}
                    </p>
                    @if (!achievement.unlocked) {
                      <div class="h-1 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                        <div
                          class="h-full bg-stone-300 dark:bg-stone-600 rounded-full transition-all duration-700"
                          [style.width.%]="
                            achievementProgress(achievement.progress, achievement.requirement)
                          "
                        ></div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- RANKING DARK — mismo lenguaje que "Ferias vs Tienda" -->
          <div
            class="lg:col-span-5 bg-stone-900 rounded-3xl p-6 lg:p-8 relative overflow-hidden group flex flex-col"
          >
            <div
              class="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-700"
            >
              <span class="material-symbols-outlined text-[140px] text-white">leaderboard</span>
            </div>

            <!-- Header ranking -->
            <div class="relative z-10 flex items-center gap-3 mb-6">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <span class="material-symbols-outlined text-amber-400">leaderboard</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">Clasificación</h3>
                <p class="text-xs text-stone-400">{{ currentMonthLabel() }}</p>
              </div>
            </div>

            <!-- Entries ranking con sub-boxes -->
            <div class="relative z-10 flex flex-col gap-3 flex-1">
              @for (entry of gamification.allLeaderboard(); track entry.userId; let i = $index) {
                <div
                  class="flex items-center gap-3 rounded-2xl p-4 transition-all"
                  [class.bg-white]="entry.rank === 1"
                  [class.text-stone-900]="entry.rank === 1"
                  [class.shadow-xl]="entry.rank === 1"
                  [class.bg-stone-800]="entry.rank === 2 || entry.rank === 3"
                  [class.text-white]="entry.rank !== 1"
                  [class.bg-transparent]="entry.rank > 3"
                  [class.opacity-50]="entry.rank > 3"
                >
                  <span
                    class="w-5 text-center text-xs font-black"
                    [class.text-stone-400]="entry.rank === 1"
                    [class.text-stone-500]="entry.rank !== 1"
                  >
                    #{{ entry.rank }}
                  </span>

                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-black shrink-0"
                    [class.bg-stone-900]="entry.rank === 1"
                    [class.text-white]="entry.rank === 1"
                    [class.bg-stone-700]="entry.rank === 2 || entry.rank === 3"
                    [class.text-stone-200]="entry.rank === 2 || entry.rank === 3"
                    [class.bg-white/10]="entry.rank > 3"
                    [class.text-white]="entry.rank > 3"
                  >
                    {{ entry.userName.charAt(0).toUpperCase() }}
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                      <p
                        class="text-[14px] font-black truncate leading-tight"
                        [class.text-stone-900]="entry.rank === 1"
                        [class.text-white]="entry.rank !== 1"
                      >
                        {{ entry.userName }}
                      </p>
                      @if (entry.streak > 2) {
                        <span class="material-symbols-outlined text-stone-900 text-sm"
                          >local_fire_department</span
                        >
                      }
                    </div>
                    <p
                      class="text-[11px] font-medium"
                      [class.text-stone-500]="entry.rank === 1"
                      [class.text-stone-400]="entry.rank !== 1"
                    >
                      {{ entry.totalSales }} ventas
                    </p>
                  </div>

                  <div class="text-right">
                    <p
                      class="text-lg font-black tracking-tight leading-none"
                      [class.text-stone-900]="entry.rank === 1"
                      [class.text-white]="entry.rank !== 1"
                    >
                      {{ entry.points }}
                    </p>
                    <p
                      class="text-[9px] uppercase tracking-widest font-bold mt-1"
                      [class.text-stone-400]="entry.rank === 1"
                      [class.text-stone-500]="entry.rank !== 1"
                    >
                      pts
                    </p>
                  </div>
                </div>
              } @empty {
                <p
                  class="text-center text-sm text-stone-500 py-6 font-bold uppercase tracking-widest"
                >
                  Sin participantes
                </p>
              }
            </div>

            <!-- Barra distribución al fondo — igual que Ferias vs Tienda -->
            <div class="relative z-10 mt-6 pt-5 border-t border-white/10">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-stone-400">
                  {{ gamification.allLeaderboard()[0]?.userName ?? '—' }}
                  {{ leadPercentage() | number: '1.0-0' }}%
                </span>
                <span class="text-xs text-stone-400"
                  >Resto {{ 100 - leadPercentage() | number: '1.0-0' }}%</span
                >
              </div>
              <div class="w-full h-2.5 bg-stone-700 rounded-full overflow-hidden flex">
                <div
                  class="h-full bg-white rounded-l-full transition-all duration-1000"
                  [style.width.%]="leadPercentage()"
                ></div>
                <div
                  class="h-full bg-stone-500 transition-all duration-1000"
                  [style.width.%]="secondPercentage()"
                ></div>
                <div
                  class="h-full bg-stone-600 rounded-r-full transition-all duration-1000"
                  [style.width.%]="100 - leadPercentage() - secondPercentage()"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL ASIGNAR META -->
      @if (showGoalModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            (click)="closeGoalModal()"
          ></div>

          <!-- Modal Panel Premium Solid -->
          <div
            class="relative bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-3xl p-8 w-full max-w-md shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] animate-scale-in"
          >
            <h2
              class="text-xl font-bold text-stone-900 dark:text-stone-100 mb-6 flex items-center gap-2"
            >
              <span class="material-symbols-outlined text-emerald-500">campaign</span>
              Asignar Meta
            </h2>

            <div class="space-y-4">
              <!-- Vendedor (Tap-Selector) -->
              <div>
                <label
                  class="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2"
                  >Vendedor a evaluar</label
                >
                <div class="flex flex-wrap gap-2">
                  @for (entry of gamification.allLeaderboard(); track entry.userId) {
                    <button
                      (click)="newGoal.userId = entry.userId"
                      class="px-4 py-2 rounded-xl text-xs font-bold transition-all border border-transparent"
                      [class.bg-stone-900]="newGoal.userId === entry.userId"
                      [class.text-white]="newGoal.userId === entry.userId"
                      [class.dark:bg-white]="newGoal.userId === entry.userId"
                      [class.dark:text-stone-900]="newGoal.userId === entry.userId"
                      [class.bg-stone-100]="newGoal.userId !== entry.userId"
                      [class.text-stone-600]="newGoal.userId !== entry.userId"
                      [class.dark:bg-stone-800]="newGoal.userId !== entry.userId"
                      [class.dark:text-stone-400]="newGoal.userId !== entry.userId"
                      [class.hover:border-stone-300]="newGoal.userId !== entry.userId"
                    >
                      {{ entry.userName }}
                    </button>
                  }
                </div>
              </div>

              <!-- Título -->
              <div>
                <label
                  class="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-1.5"
                  >Descripción de la meta</label
                >
                <input
                  [(ngModel)]="newGoal.title"
                  type="text"
                  placeholder="Ej: Bono de Verano, Vender 50 jeans"
                  class="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700/50 rounded-xl px-4 py-3 text-sm font-semibold text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-500/50 placeholder:font-normal placeholder:opacity-50 transition-shadow"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Métrica (Tap-Selector) -->
                <div>
                  <label
                    class="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2"
                    >Métrica</label
                  >
                  <div class="flex bg-stone-100 dark:bg-stone-800 rounded-xl p-1">
                    <button
                      (click)="newGoal.metric = 'sales_count'"
                      class="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
                      [class.bg-white]="newGoal.metric === 'sales_count'"
                      [class.dark:bg-stone-700]="newGoal.metric === 'sales_count'"
                      [class.shadow-sm]="newGoal.metric === 'sales_count'"
                      [class.text-stone-900]="newGoal.metric === 'sales_count'"
                      [class.dark:text-white]="newGoal.metric === 'sales_count'"
                      [class.text-stone-500]="newGoal.metric !== 'sales_count'"
                    >
                      Ventas
                    </button>
                    <button
                      (click)="newGoal.metric = 'revenue'"
                      class="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
                      [class.bg-white]="newGoal.metric === 'revenue'"
                      [class.dark:bg-stone-700]="newGoal.metric === 'revenue'"
                      [class.shadow-sm]="newGoal.metric === 'revenue'"
                      [class.text-stone-900]="newGoal.metric === 'revenue'"
                      [class.dark:text-white]="newGoal.metric === 'revenue'"
                      [class.text-stone-500]="newGoal.metric !== 'revenue'"
                    >
                      Dinero
                    </button>
                  </div>
                </div>
                <!-- Objetivo -->
                <div>
                  <label
                    class="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-1.5"
                    >Objetivo (Num)</label
                  >
                  <input
                    [(ngModel)]="newGoal.target"
                    type="number"
                    min="1"
                    class="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700/50 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-500/50 transition-shadow"
                  />
                </div>
              </div>
            </div>

            <div class="mt-8 flex items-center justify-end gap-3">
              <button
                (click)="closeGoalModal()"
                class="px-5 py-2.5 rounded-xl text-[13px] font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                (click)="saveGoal()"
                class="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white bg-stone-900 hover:bg-stone-800 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-stone-900 transition-all shadow-md active:scale-95"
              >
                Crear Meta
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [],
})
export class GoalsPageComponent {
  gamification = inject(GamificationService);
  private themeService = inject(ThemeService);
  private authService = inject(BackendAuthService);

  isDark = this.themeService.darkMode;
  currentUser = this.authService.currentUser;

  levelProgress = computed(() => {
    const level = this.gamification.currentLevel();
    const points = this.gamification.stats().totalPoints;
    const start = (level - 1) * 500;
    const end = level * 500;
    return Math.min(Math.max(((points - start) / (end - start)) * 100, 0), 100);
  });

  unlockedAchievements = computed(
    () => this.gamification.allAchievements().filter((a) => a.unlocked).length,
  );

  currentMonthLabel = computed(() =>
    new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }),
  );

  /** % de puntos del líder sobre el total del leaderboard */
  leadPercentage = computed(() => {
    const board = this.gamification.allLeaderboard();
    if (!board.length) return 0;
    const total = board.reduce((acc, e) => acc + e.points, 0);
    return total > 0 ? Math.round((board[0].points / total) * 100) : 0;
  });

  secondPercentage = computed(() => {
    const board = this.gamification.allLeaderboard();
    if (board.length < 2) return 0;
    const total = board.reduce((acc, e) => acc + e.points, 0);
    return total > 0 ? Math.round((board[1].points / total) * 100) : 0;
  });

  constructor() {
    this.gamification.loadData();
  }

  goalTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      daily: 'Diaria',
      weekly: 'Semanal',
      monthly: 'Mensual',
      custom: 'Personalizada',
    };
    return labels[type] ?? type;
  }

  metricLabel(metric: string): string {
    const labels: Record<string, string> = {
      sales_count: 'ventas',
      revenue: 'en ingresos',
      new_customers: 'clientes nuevos',
      avg_ticket: 'de ticket promedio',
    };
    return labels[metric] ?? metric;
  }

  goalProgress(current: number, target: number): number {
    return Math.min(Math.round((current / target) * 100), 100);
  }

  achievementProgress(current: number, required: number): number {
    return Math.min(Math.round((current / required) * 100), 100);
  }

  // ============================================
  // LOGICA DEL MODAL DE CREACIÓN DE METAS (ZEN)
  // ============================================
  get isAdmin() {
    return this.currentUser()?.rol === 'ADMIN';
  }

  showGoalModal = signal(false);
  newGoal = { userId: '', title: '', description: '', metric: 'sales_count', target: 0 };

  openGoalModal() {
    this.showGoalModal.set(true);
    this.newGoal = {
      userId: '',
      title: '',
      description: 'Meta extraordinaria asignada por dirección',
      metric: 'sales_count',
      target: 10,
    };
  }

  closeGoalModal() {
    this.showGoalModal.set(false);
  }

  saveGoal() {
    if (!this.newGoal.userId || !this.newGoal.target || !this.newGoal.title) return;

    this.gamification.assignAdminGoal(this.newGoal).subscribe({
      next: () => {
        this.closeGoalModal();
      },
    });
  }
}
