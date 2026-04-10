import { Injectable, signal, computed, inject } from '@angular/core';
import { Achievement, Goal, LeaderboardEntry, UserStats } from '../models';
import { ToastService } from './toast.service';
import { BackendAuthService } from './backend-auth.service';
import { ApiService } from './api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GamificationService {
  private api = inject(ApiService);
  private backendAuthService = inject(BackendAuthService);
  private toastService = inject(ToastService);

  // Estado reactivo (Fuente de verdad desde el backend)
  private achievements = signal<Achievement[]>([]);
  private goals = signal<Goal[]>([]);
  private leaderboard = signal<LeaderboardEntry[]>([]);
  private userStats = signal<UserStats>({
    userId: '',
    totalPoints: 0,
    level: 1,
    achievementsUnlocked: [],
    currentStreak: 0,
    longestStreak: 0,
    totalSalesCompleted: 0,
    totalRevenueGenerated: 0,
    joinedAt: new Date()
  });

  // Públicos (readonly)
  readonly allAchievements = this.achievements.asReadonly();
  readonly allGoals = this.goals.asReadonly();
  readonly allLeaderboard = this.leaderboard.asReadonly();
  readonly stats = this.userStats.asReadonly();

  // Computados
  readonly unlockedAchievements = computed(() => 
    this.achievements().filter(a => a.unlocked)
  );

  readonly lockedAchievements = computed(() => 
    this.achievements().filter(a => !a.unlocked)
  );

  readonly activeGoals = computed(() => 
    this.goals().filter(g => g.status === 'active')
  );

  readonly completedGoals = computed(() => 
    this.goals().filter(g => g.status === 'completed')
  );

  readonly currentLevel = computed(() => {
    return this.userStats().level || 1;
  });

  readonly pointsToNextLevel = computed(() => {
    const currentLevel = this.currentLevel();
    const nextLevelPoints = currentLevel * 500;
    const currentPoints = this.userStats().totalPoints || 0;
    return nextLevelPoints - currentPoints;
  });

  constructor() {
    this.loadData();
  }

  // ============================================
  // CARGA DE DATOS DESDE SPRING BOOT API
  // ============================================

  loadData() {
    const currentUser = this.backendAuthService.currentUser();
    if (!currentUser) return; // Si no hay usuario autenticado, salir

    this.loadUserStats();
    this.loadUserAchievements();
    this.loadUserGoals();
    this.updateLeaderboard();
  }

  private loadUserStats() {
    this.api.get<any>('gamification/me/stats').subscribe({
      next: (stats) => {
        if (stats) {
          this.userStats.set({
            ...stats,
            joinedAt: new Date(stats.joinedAt || new Date())
          });
        }
      },
      error: (err) => console.error('Error cargando stats', err)
    });
  }

  private loadUserAchievements() {
    this.api.get<any[]>('gamification/me/achievements').subscribe({
      next: (achievements) => {
        if (achievements && achievements.length > 0) {
          // Mapeo básico si es necesario
          const mappedAchievements: Achievement[] = achievements.map(a => ({
            id: a.achievementKey || a.id,
            title: a.title,
            description: a.description,
            icon: a.icon || 'star',
            category: a.category,
            tier: a.tier,
            requirement: a.requirement,
            progress: a.progress,
            unlocked: a.unlocked,
            unlockedAt: a.unlockedAt ? new Date(a.unlockedAt) : undefined,
            points: a.points
          }));
          this.achievements.set(mappedAchievements);
        } else {
          // Si por algun motivo esta vacio, invocamos la creacion y recargamos
          this.initializeAchievements();
        }
      },
      error: (err) => console.error('Error cargando logros', err)
    });
  }

  private loadUserGoals() {
    this.api.get<any[]>('gamification/me/goals').subscribe({
      next: (goalsData) => {
        if (goalsData) {
          const goals = goalsData.map(g => ({
            ...g,
            startDate: new Date(g.startDate),
            endDate: new Date(g.endDate)
          }));
          this.goals.set(goals);
        }
      },
      error: (err) => console.error('Error cargando metas', err)
    });
  }

  public updateLeaderboard() {
    this.api.get<any[]>('gamification/leaderboard').subscribe({
      next: (data) => {
        if (data) {
          // El API devuelve un arreglo de map: userId, totalPoints, level, etc.
          // Falta el userName en la respuesta Java (podria devolverlo despues).
          // Como work-around temporal lo ponemos genérico.
          const mapped = data.map((d, index) => {
            return {
              userId: d.userId,
              userName: d.userName || 'Usuario', 
              totalSales: d.totalSales,
              totalRevenue: d.totalRevenue || 0,
              achievementsCount: d.achievementsCount,
              points: d.totalPoints,
              rank: index + 1,
              streak: d.currentStreak,
              badge: this.getBadgeForRank(index, d.currentStreak)
            } as LeaderboardEntry;
          });
          this.leaderboard.set(mapped);
        }
      },
      error: (err) => console.error('Error cargando leaderboard', err)
    });
  }

  private initializeAchievements() {
    this.api.post<void>('gamification/me/initialize', {}).subscribe({
      next: () => {
        this.loadUserAchievements();
      },
      error: (err) => console.error('Error inicializando logros', err)
    });
  }

  private getBadgeForRank(index: number, streak: number): 'champion'|'top_seller'|'consistent'|'rising_star' {
    if (index === 0) return 'champion';
    if (index === 1) return 'top_seller';
    if (streak >= 7) return 'consistent';
    return 'rising_star';
  }

  // ============================================
  // MÉTODOS DE CREACIÓN LOCAL (Temporales si el backend aùn no los tiene)
  // ============================================

  createGoal(goalData: Omit<Goal, 'id' | 'current' | 'status'>): Goal {
    const newGoal: Goal = {
      ...goalData,
      id: `goal-local-${Date.now()}`,
      current: 0,
      status: 'active'
    };
    // El backend actualmente crea las metas semanales y mensuales automáticamente
    // Si queremos custom en el futuro, requerirá un endpoint POST /goals
    this.goals.update(goals => [newGoal, ...goals]);
    return newGoal;
  }

  deleteGoal(goalId: string) {
    this.goals.update(goals => goals.filter(g => g.id !== goalId));
  }

  resetProgress() {
    this.toastService.info('Esta acción requiere borrado seguro en la BD (Implementar en backend)');
  }
}
