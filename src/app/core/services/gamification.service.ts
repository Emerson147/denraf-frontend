import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Achievement, Goal, LeaderboardEntry, UserStats } from '../models';
import { SalesService } from './sales.service';
import { NotificationService } from './notification.service';
import { ToastService } from './toast.service';
import { AuthService } from '../auth/auth';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class GamificationService {
  private salesService = inject(SalesService);
  private notificationService = inject(NotificationService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private logger = inject(LoggerService);

  // Estado reactivo
  private achievements = signal<Achievement[]>([]);
  private goals = signal<Goal[]>([]);
  private leaderboard = signal<LeaderboardEntry[]>([]);
  private userStats = signal<UserStats>({
    userId: 'user-1',
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
    const points = this.userStats().totalPoints;
    return Math.floor(points / 500) + 1; // Cada 500 puntos = 1 nivel
  });

  readonly pointsToNextLevel = computed(() => {
    const currentLevel = this.currentLevel();
    const nextLevelPoints = currentLevel * 500;
    const currentPoints = this.userStats().totalPoints;
    return nextLevelPoints - currentPoints;
  });

  constructor() {
    this.loadFromLocalStorage();
    this.initializeDefaultAchievements();
    this.initializeDefaultGoals();
    
    // Detectar logros automáticamente cuando cambian las ventas
    effect(() => {
      const allSales = this.salesService.allSales();
      const currentUserId = this.authService.currentUser()?.id;
      
      // Filtrar ventas solo del vendedor actual
      const userSales = currentUserId 
        ? allSales.filter(s => s.vendedorId === currentUserId)
        : allSales;
      
      this.checkAchievements(userSales);
      this.updateGoalsProgress(userSales);
      this.updateLeaderboard();
    });
  }

  // ============================================
  // ACHIEVEMENTS
  // ============================================

  private initializeDefaultAchievements() {
    if (this.achievements().length > 0) return;

    const defaultAchievements: Achievement[] = [
      // Sales Count
      {
        id: 'ach-first-sale',
        title: 'Primera Venta',
        description: 'Completa tu primera venta',
        icon: 'sell',
        category: 'sales',
        tier: 'bronze',
        requirement: 1,
        progress: 0,
        unlocked: false,
        points: 50
      },
      {
        id: 'ach-10-sales',
        title: 'Vendedor Novato',
        description: 'Completa 10 ventas',
        icon: 'shopping_bag',
        category: 'sales',
        tier: 'bronze',
        requirement: 10,
        progress: 0,
        unlocked: false,
        points: 100
      },
      {
        id: 'ach-50-sales',
        title: 'Vendedor Experimentado',
        description: 'Completa 50 ventas',
        icon: 'local_mall',
        category: 'sales',
        tier: 'silver',
        requirement: 50,
        progress: 0,
        unlocked: false,
        points: 300
      },
      {
        id: 'ach-100-sales',
        title: 'Vendedor Profesional',
        description: 'Completa 100 ventas',
        icon: 'workspace_premium',
        category: 'sales',
        tier: 'gold',
        requirement: 100,
        progress: 0,
        unlocked: false,
        points: 500
      },
      {
        id: 'ach-500-sales',
        title: 'Maestro de Ventas',
        description: 'Completa 500 ventas',
        icon: 'stars',
        category: 'sales',
        tier: 'platinum',
        requirement: 500,
        progress: 0,
        unlocked: false,
        points: 1000
      },

      // Revenue (Ajustado para tienda de ropa)
      {
        id: 'ach-500-revenue',
        title: 'Primeros Ingresos',
        description: 'Genera S/ 500 en ventas',
        icon: 'payments',
        category: 'revenue',
        tier: 'bronze',
        requirement: 500,
        progress: 0,
        unlocked: false,
        points: 100
      },
      {
        id: 'ach-2k-revenue',
        title: 'Vendedor Constante',
        description: 'Genera S/ 2,000 en ventas',
        icon: 'account_balance_wallet',
        category: 'revenue',
        tier: 'silver',
        requirement: 2000,
        progress: 0,
        unlocked: false,
        points: 200
      },
      {
        id: 'ach-4k-revenue',
        title: 'Meta Mensual',
        description: 'Genera S/ 4,000 en ventas',
        icon: 'trending_up',
        category: 'revenue',
        tier: 'gold',
        requirement: 4000,
        progress: 0,
        unlocked: false,
        points: 300
      },
      {
        id: 'ach-5k-revenue',
        title: 'Mes Excepcional',
        description: 'Genera S/ 5,000 en ventas',
        icon: 'monetization_on',
        category: 'revenue',
        tier: 'platinum',
        requirement: 5000,
        progress: 0,
        unlocked: false,
        points: 500
      },

      // Streak
      {
        id: 'ach-streak-7',
        title: 'Racha de Fuego',
        description: '7 días consecutivos con ventas',
        icon: 'local_fire_department',
        category: 'streak',
        tier: 'silver',
        requirement: 7,
        progress: 0,
        unlocked: false,
        points: 200
      },
      {
        id: 'ach-streak-30',
        title: 'Imparable',
        description: '30 días consecutivos con ventas',
        icon: 'whatshot',
        category: 'streak',
        tier: 'gold',
        requirement: 30,
        progress: 0,
        unlocked: false,
        points: 500
      },

      // Special (Ajustado para ropa)
      {
        id: 'ach-big-sale',
        title: 'Venta Grande',
        description: 'Venta de más de S/ 200',
        icon: 'workspace_premium',
        category: 'special',
        tier: 'silver',
        requirement: 1,
        progress: 0,
        unlocked: false,
        points: 150
      },
      {
        id: 'ach-early-bird',
        title: 'Madrugador',
        description: 'Primera venta del día antes de las 10am',
        icon: 'wb_sunny',
        category: 'special',
        tier: 'bronze',
        requirement: 1,
        progress: 0,
        unlocked: false,
        points: 50
      }
    ];

    this.achievements.set(defaultAchievements);
    this.saveToLocalStorage();
  }

  private checkAchievements(sales: any[]) {
    let hasNewUnlock = false;

    this.achievements.update(achievements => {
      return achievements.map(ach => {
        if (ach.unlocked) return ach;

        let newProgress = ach.progress;

        // Sales count achievements
        if (ach.category === 'sales') {
          newProgress = sales.length;
        }

        // Revenue achievements
        if (ach.category === 'revenue') {
          newProgress = sales.reduce((sum, s) => sum + s.total, 0);
        }

        // Streak achievements
        if (ach.category === 'streak') {
          newProgress = this.calculateStreak(sales);
        }

        // Big sale achievement
        if (ach.id === 'ach-big-sale') {
          const hasBigSale = sales.some(s => s.total >= 200);
          newProgress = hasBigSale ? 1 : 0;
        }

        // Early bird achievement
        if (ach.id === 'ach-early-bird') {
          const hasEarlySale = sales.some(s => {
            const saleHour = new Date(s.date).getHours();
            return saleHour < 10;
          });
          newProgress = hasEarlySale ? 1 : 0;
        }

        // Check if unlocked
        const shouldUnlock = newProgress >= ach.requirement && !ach.unlocked;

        if (shouldUnlock) {
          hasNewUnlock = true;
          this.onAchievementUnlocked(ach);
          
          return {
            ...ach,
            progress: newProgress,
            unlocked: true,
            unlockedAt: new Date()
          };
        }

        return { ...ach, progress: newProgress };
      });
    });

    if (hasNewUnlock) {
      this.saveToLocalStorage();
    }
  }

  private onAchievementUnlocked(achievement: Achievement) {
    // Agregar puntos
    this.userStats.update(stats => ({
      ...stats,
      totalPoints: stats.totalPoints + achievement.points,
      achievementsUnlocked: [...stats.achievementsUnlocked, achievement.id]
    }));

    // Notificación con confetti
    this.toastService.success(`¡Logro desbloqueado! +${achievement.points} puntos`);
    
    this.notificationService.add({
      type: 'success',
      title: `🏆 ${achievement.title}`,
      message: achievement.description
    });

    console.log('🎉 Achievement unlocked:', achievement);
  }

  private calculateStreak(sales: any[]): number {
    if (sales.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const salesDates = sales
      .map(s => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => b - a);

    let streak = 0;
    let expectedDate = today.getTime();

    for (const saleDate of salesDates) {
      if (saleDate === expectedDate) {
        streak++;
        expectedDate -= 24 * 60 * 60 * 1000;
      } else {
        break;
      }
    }

    return streak;
  }

  // ============================================
  // GOALS
  // ============================================

  private initializeDefaultGoals() {
    if (this.goals().length > 0) return;

    const today = new Date();
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const defaultGoals: Goal[] = [
      {
        id: 'goal-weekly-sales',
        title: 'Meta Semanal',
        description: '10 ventas esta semana',
        type: 'weekly',
        metric: 'sales_count',
        target: 10,
        current: 0,
        startDate: today,
        endDate: endOfWeek,
        status: 'active'
      },
      {
        id: 'goal-monthly-revenue',
        title: 'Meta Mensual',
        description: 'S/ 4,000 en ventas este mes',
        type: 'monthly',
        metric: 'revenue',
        target: 4000,
        current: 0,
        startDate: new Date(today.getFullYear(), today.getMonth(), 1),
        endDate: endOfMonth,
        status: 'active'
      }
    ];

    this.goals.set(defaultGoals);
    this.saveToLocalStorage();
  }

  private updateGoalsProgress(sales: any[]) {
    this.goals.update(goals => {
      return goals.map(goal => {
        if (goal.status !== 'active') return goal;

        const relevantSales = sales.filter(s => {
          const saleDate = new Date(s.date);
          return saleDate >= goal.startDate && saleDate <= goal.endDate;
        });

        let newCurrent = 0;

        switch (goal.metric) {
          case 'sales_count':
            newCurrent = relevantSales.length;
            break;
          case 'revenue':
            newCurrent = relevantSales.reduce((sum, s) => sum + s.total, 0);
            break;
          case 'new_customers':
            newCurrent = relevantSales.filter(s => s.customer).length;
            break;
          case 'avg_ticket':
            newCurrent = relevantSales.length > 0 
              ? relevantSales.reduce((sum, s) => sum + s.total, 0) / relevantSales.length 
              : 0;
            break;
        }

        const isCompleted = newCurrent >= goal.target;
        const newStatus = isCompleted ? 'completed' as const : 'active' as const;

        if (isCompleted && goal.status === 'active') {
          this.onGoalCompleted(goal);
        }

        return {
          ...goal,
          current: newCurrent,
          status: newStatus
        };
      });
    });

    this.saveToLocalStorage();
  }

  private onGoalCompleted(goal: Goal) {
    this.toastService.success(`¡Meta completada! ${goal.title}`);
    
    this.notificationService.add({
      type: 'success',
      title: `🎯 Meta Alcanzada`,
      message: goal.title
    });

    console.log('🎯 Goal completed:', goal);
  }

  createGoal(goalData: Omit<Goal, 'id' | 'current' | 'status'>): Goal {
    const newGoal: Goal = {
      ...goalData,
      id: `goal-${Date.now()}`,
      current: 0,
      status: 'active'
    };

    this.goals.update(goals => [newGoal, ...goals]);
    this.saveToLocalStorage();

    return newGoal;
  }

  deleteGoal(goalId: string) {
    this.goals.update(goals => goals.filter(g => g.id !== goalId));
    this.saveToLocalStorage();
  }

  // ============================================
  // LEADERBOARD
  // ============================================

  updateLeaderboard() {
    const allSales = this.salesService.allSales();
    const users = this.authService.getAvailableUsers();
    
    // Calcular stats reales por vendedor
    const leaderboardData: LeaderboardEntry[] = users.map(user => {
      const userSales = allSales.filter(s => s.vendedorId === user.id);
      const totalRevenue = userSales.reduce((sum, s) => sum + s.total, 0);
      const streak = this.calculateStreak(userSales);
      
      // Cargar achievements del usuario desde localStorage
      const userAchievementsKey = `denraf_achievements_${user.id}`;
      const storedAchievements = localStorage.getItem(userAchievementsKey);
      let achievementsCount = 0;
      let points = 0;
      
      if (storedAchievements) {
        try {
          const achievements = JSON.parse(storedAchievements);
          achievementsCount = achievements.filter((a: Achievement) => a.unlocked).length;
          points = achievements
            .filter((a: Achievement) => a.unlocked)
            .reduce((sum: number, a: Achievement) => sum + a.points, 0);
        } catch (e) {
          console.error('Error loading user achievements:', e);
        }
      }
      
      return {
        userId: user.id,
        userName: user.name,
        totalSales: userSales.length,
        totalRevenue,
        achievementsCount,
        points,
        rank: 0, // Se actualizará después del sort
        streak,
        badge: 'rising_star' as const
      };
    });
    
    // Ordenar por puntos y asignar rankings
    const sorted = leaderboardData.sort((a, b) => b.points - a.points);
    sorted.forEach((entry, index) => {
      entry.rank = index + 1;
      if (index === 0) entry.badge = 'champion' as const;
      else if (index === 1) entry.badge = 'top_seller' as const;
      else if (entry.streak >= 7) entry.badge = 'consistent' as const;
      else entry.badge = 'rising_star' as const;
    });
    
    this.leaderboard.set(sorted);
  }  // ============================================
  // PERSISTENCE
  // ============================================

  private saveToLocalStorage() {
    const userId = this.authService.currentUser()?.id || 'user-1';
    localStorage.setItem(`denraf_achievements_${userId}`, JSON.stringify(this.achievements()));
    localStorage.setItem(`denraf_goals_${userId}`, JSON.stringify(this.goals()));
    localStorage.setItem(`denraf_user_stats_${userId}`, JSON.stringify(this.userStats()));
  }

  private loadFromLocalStorage() {
    const userId = this.authService.currentUser()?.id || 'user-1';
    const achievementsData = localStorage.getItem(`denraf_achievements_${userId}`);
    const goalsData = localStorage.getItem(`denraf_goals_${userId}`);
    const statsData = localStorage.getItem(`denraf_user_stats_${userId}`);

    if (achievementsData) {
      try {
        this.achievements.set(JSON.parse(achievementsData));
      } catch (e) {
        console.error('Error loading achievements:', e);
      }
    }

    if (goalsData) {
      try {
        const parsed = JSON.parse(goalsData);
        const goals = parsed.map((g: any) => ({
          ...g,
          startDate: new Date(g.startDate),
          endDate: new Date(g.endDate)
        }));
        this.goals.set(goals);
      } catch (e) {
        console.error('Error loading goals:', e);
      }
    }

    if (statsData) {
      try {
        const parsed = JSON.parse(statsData);
        this.userStats.set({
          ...parsed,
          userId: userId, // Asegurar que el userId coincida
          joinedAt: new Date(parsed.joinedAt)
        });
      } catch (e) {
        console.error('Error loading user stats:', e);
      }
    }
  }

  resetProgress() {
    if (confirm('¿Estás seguro de resetear todo el progreso?')) {
      this.achievements.set([]);
      this.goals.set([]);
      this.userStats.set({
        userId: 'user-1',
        totalPoints: 0,
        level: 1,
        achievementsUnlocked: [],
        currentStreak: 0,
        longestStreak: 0,
        totalSalesCompleted: 0,
        totalRevenueGenerated: 0,
        joinedAt: new Date()
      });
      
      this.initializeDefaultAchievements();
      this.initializeDefaultGoals();
      
      this.toastService.info('Progreso reseteado');
    }
  }
}
