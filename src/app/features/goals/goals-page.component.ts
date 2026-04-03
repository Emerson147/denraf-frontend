import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamificationService } from '../../core/services/gamification.service';
import { ThemeService } from '../../core/theme/theme.service';
import { AuthService } from '../../core/auth/auth';
import { UiPageHeaderComponent } from '../../shared/ui/ui-page-header/ui-page-header.component';

@Component({
  selector: 'app-goals-page',
  standalone: true,
  imports: [CommonModule, UiPageHeaderComponent],
  template: `
    <div class="min-h-screen bg-stone-50 dark:bg-stone-950 p-4 sm:p-6 lg:p-8 transition-colors duration-100">
      <div class="max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <app-ui-page-header
            title="Metas y Logros"
            [subtitle]="currentUser() ? currentUser()!.name : 'Gamificación'"
            icon="🎯"
          />
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <!-- Nivel -->
          <div class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-6 hover:shadow-md transition-all">
            <div class="flex items-start justify-between mb-4">
              <div class="h-10 w-10 rounded-xl bg-stone-900 dark:bg-stone-100 flex items-center justify-center text-white dark:text-stone-900 transition-colors duration-100">
                <span class="material-icons-outlined text-lg">military_tech</span>
              </div>
              <span class="text-xs font-medium text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-full">
                Nivel
              </span>
            </div>
            <p class="text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wide font-medium mb-1">
              Nivel Actual
            </p>
            <p class="text-3xl font-bold text-stone-900 dark:text-stone-100">
              {{ gamification.currentLevel() }}
            </p>
            <p class="text-xs text-stone-400 dark:text-stone-500 mt-2">
              {{ gamification.pointsToNextLevel() }} pts al siguiente
            </p>
          </div>

          <!-- Puntos Totales -->
          <div class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-6 hover:shadow-md transition-all">
            <div class="flex items-start justify-between mb-4">
              <div class="h-10 w-10 rounded-xl bg-stone-900 dark:bg-stone-100 flex items-center justify-center text-white dark:text-stone-900 transition-colors duration-100">
                <span class="material-icons-outlined text-lg">stars</span>
              </div>
              <span class="text-xs font-medium text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-full">
                Total
              </span>
            </div>
            <p class="text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wide font-medium mb-1">
              Puntos
            </p>
            <p class="text-3xl font-bold bg-linear-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              {{ gamification.stats().totalPoints }}
            </p>
            <p class="text-xs text-stone-400 dark:text-stone-500 mt-2">
              Progreso {{ levelProgress() | number: '1.0-0' }}%
            </p>
          </div>

          <!-- Racha Actual -->
          <div class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-6 hover:shadow-md transition-all">
            <div class="flex items-start justify-between mb-4">
              <div class="h-10 w-10 rounded-xl bg-stone-900 dark:bg-stone-100 flex items-center justify-center text-white dark:text-stone-900 transition-colors duration-100">
                <span class="material-icons-outlined text-lg">local_fire_department</span>
              </div>
              <span class="text-xs font-medium text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-full">
                Racha
              </span>
            </div>
            <p class="text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wide font-medium mb-1">
              Días Consecutivos
            </p>
            <p class="text-3xl font-bold text-stone-900 dark:text-stone-100">
              {{ gamification.stats().currentStreak }}
            </p>
            <p class="text-xs text-stone-400 dark:text-stone-500 mt-2">
              Máx: {{ gamification.stats().longestStreak }} días
            </p>
          </div>

          <!-- Logros Desbloqueados -->
          <div class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-6 hover:shadow-md transition-all">
            <div class="flex items-start justify-between mb-4">
              <div class="h-10 w-10 rounded-xl bg-stone-900 dark:bg-stone-100 flex items-center justify-center text-white dark:text-stone-900 transition-colors duration-100">
                <span class="material-icons-outlined text-lg">emoji_events</span>
              </div>
              <span class="text-xs font-medium text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-full">
                Logros
              </span>
            </div>
            <p class="text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wide font-medium mb-1">
              Desbloqueados
            </p>
            <p class="text-3xl font-bold text-stone-900 dark:text-stone-100">
              {{ unlockedAchievements() }}
            </p>
            <p class="text-xs text-stone-400 dark:text-stone-500 mt-2">
              de {{ gamification.allAchievements().length }} totales
            </p>
          </div>
        </div>


        <!-- Metas Activas -->
        <div class="space-y-3">
          <h2 class="text-sm font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wide">
            🎯 Metas Activas
          </h2>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            @for (goal of gamification.activeGoals(); track goal.id) {
              <div class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-6 hover:shadow-md transition-all">
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <h3 class="font-semibold text-stone-900 dark:text-stone-100 mb-1">
                      {{ goal.title }}
                    </h3>
                    <p class="text-sm text-stone-600 dark:text-stone-400">
                      {{ goal.description }}
                    </p>
                  </div>
                  
                  <span class="px-3 py-1 rounded-full text-xs font-medium shrink-0 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                    {{ goalTypeLabel(goal.type) }}
                  </span>
                </div>
                
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-medium text-stone-700 dark:text-stone-300">
                      {{ goal.current }} / {{ goal.target }} {{ metricLabel(goal.metric) }}
                    </span>
                    <span class="text-stone-600 dark:text-stone-400">
                      {{ goalProgress(goal.current, goal.target) }}%
                    </span>
                  </div>
                  
                  <div class="h-2 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-800">
                    <div class="h-full bg-emerald-500 dark:bg-emerald-600 transition-all duration-300"
                         [style.width.%]="goalProgress(goal.current, goal.target)"></div>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="col-span-full bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-12 text-center">
                <span class="text-6xl mb-3 block opacity-40">🎯</span>
                <p class="text-stone-600 dark:text-stone-400">
                  No hay metas activas
                </p>
              </div>
            }
          </div>
        </div>

        <!-- Logros -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <!-- Achievements Grid (2 cols) -->
          <div class="lg:col-span-2 space-y-3">
            <h2 class="text-sm font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wide">
              🏆 Logros
            </h2>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              @for (achievement of gamification.allAchievements(); track achievement.id) {
                <div class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-all"
                     [class.opacity-60]="!achievement.unlocked">
                  
                  <div class="flex items-start gap-3">
                    <div class="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                      <span class="material-icons-outlined text-2xl">{{ achievement.icon }}</span>
                    </div>
                    
                    <div class="flex-1 min-w-0">
                      <h3 class="font-semibold text-sm text-stone-900 dark:text-stone-100 mb-1">
                        {{ achievement.title }}
                      </h3>
                      <p class="text-xs text-stone-600 dark:text-stone-400 mb-2">
                        {{ achievement.description }}
                      </p>
                      
                      @if (!achievement.unlocked) {
                        <div class="space-y-1">
                          <div class="h-1.5 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-800">
                            <div class="h-full bg-stone-400 dark:bg-stone-600 transition-all duration-300"
                                 [style.width.%]="achievementProgress(achievement.progress, achievement.requirement)"></div>
                          </div>
                          <p class="text-xs text-stone-500 dark:text-stone-500">
                            {{ achievement.progress }} / {{ achievement.requirement }}
                          </p>
                        </div>
                      } @else {
                        <div class="flex items-center gap-1.5">
                          <span class="material-icons-outlined text-sm text-emerald-500">check_circle</span>
                          <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            +{{ achievement.points }} pts
                          </span>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Ranking (1 col) -->
          <div class="lg:col-span-1 space-y-3">
            <h2 class="text-sm font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wide">
              👑 Ranking
            </h2>
            
            <div class="space-y-3">
              @for (entry of gamification.allLeaderboard(); track entry.userId) {
                <div class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-4 hover:shadow-md transition-all"
                     [class.ring-2]="entry.rank === 1"
                     [class.ring-amber-400]="entry.rank === 1"
                     [class.dark:ring-amber-500]="entry.rank === 1">
                  
                  <div class="flex items-center gap-3">
                    <!-- Rank Badge -->
                    <div class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                         [class.bg-gradient-to-br]="entry.rank <= 3"
                         [class.from-yellow-400]="entry.rank === 1"
                         [class.to-yellow-600]="entry.rank === 1"
                         [class.text-white]="entry.rank === 1"
                         [class.from-slate-300]="entry.rank === 2"
                         [class.to-slate-500]="entry.rank === 2"
                         [class.text-white]="entry.rank === 2"
                         [class.from-amber-600]="entry.rank === 3"
                         [class.to-amber-800]="entry.rank === 3"
                         [class.text-white]="entry.rank === 3"
                         [class.bg-stone-200]="entry.rank > 3"
                         [class.dark:bg-stone-800]="entry.rank > 3"
                         [class.text-stone-700]="entry.rank > 3"
                         [class.dark:text-stone-300]="entry.rank > 3">
                      {{ entry.rank }}
                    </div>
                    
                    <!-- User Info -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <h3 class="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate">
                          {{ entry.userName }}
                        </h3>
                        @if (entry.streak > 0) {
                          <span class="text-xs" title="Racha">🔥{{ entry.streak }}</span>
                        }
                      </div>
                      
                      <div class="flex items-center gap-2 mt-1 text-xs text-stone-600 dark:text-stone-400">
                        <span>{{ entry.totalSales }} ventas</span>
                        <span>•</span>
                        <span>{{ entry.achievementsCount }} logros</span>
                      </div>
                    </div>
                    
                    <!-- Points -->
                    <div class="text-right shrink-0">
                      <div class="font-bold text-sm bg-linear-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                        {{ entry.points }}
                      </div>
                      <div class="text-xs text-stone-500 dark:text-stone-500">
                        pts
                      </div>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-12 text-center">
                  <span class="text-6xl mb-3 block opacity-40">👑</span>
                  <p class="text-stone-600 dark:text-stone-400 text-sm">
                    El ranking se actualizará pronto
                  </p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class GoalsPageComponent {
  gamification = inject(GamificationService);
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  
  isDark = this.themeService.darkMode;
  currentUser = this.authService.currentUser;

  levelProgress = computed(() => {
    const currentLevel = this.gamification.currentLevel();
    const currentPoints = this.gamification.stats().totalPoints;
    const levelStart = (currentLevel - 1) * 500;
    const levelEnd = currentLevel * 500;
    const progress = ((currentPoints - levelStart) / (levelEnd - levelStart)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  });

  unlockedAchievements = computed(() => {
    return this.gamification.allAchievements().filter(a => a.unlocked).length;
  });

  constructor() {
    // Update leaderboard on init
    this.gamification.updateLeaderboard();
  }

  goalTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      daily: 'Diaria',
      weekly: 'Semanal',
      monthly: 'Mensual',
      custom: 'Personalizada'
    };
    return labels[type] || type;
  }

  metricLabel(metric: string): string {
    const labels: Record<string, string> = {
      sales_count: 'ventas',
      revenue: 'en ingresos',
      new_customers: 'clientes nuevos',
      avg_ticket: 'de ticket promedio'
    };
    return labels[metric] || metric;
  }

  goalProgress(current: number, target: number): number {
    return Math.min(Math.round((current / target) * 100), 100);
  }

  achievementProgress(current: number, required: number): number {
    return Math.min(Math.round((current / required) * 100), 100);
  }
}
