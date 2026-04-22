import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, Notification, NotificationType, NotificationCategory } from '../../core/services/notification.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-stone-50 dark:bg-stone-950 p-6 md:p-8 transition-colors duration-300 ease-out">
      <div class="w-full space-y-6">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-50 tracking-tight">
              Centro de Notificaciones
            </h1>
            <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
              {{ notificationService.allNotifications().length }} notificaciones · {{ notificationService.unreadCount() }} sin leer
            </p>
          </div>

          <div class="flex items-center gap-2">
            @if (notificationService.unreadCount() > 0) {
              <button
                (click)="notificationService.markAllAsRead()"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 transition-all">
                <span class="material-icons-outlined text-[16px]">done_all</span>
                Marcar todas como leídas
              </button>
            }
            @if (notificationService.allNotifications().length > 0) {
              <button
                (click)="notificationService.clearAll()"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
                <span class="material-icons-outlined text-[16px]">delete_sweep</span>
                Limpiar todo
              </button>
            }
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="flex gap-2 flex-wrap">
          @for (tab of filterTabs; track tab.key) {
            <button 
              (click)="activeFilter.set(tab.key)"
              class="px-4 py-2 rounded-xl text-xs font-semibold transition-all border"
              [ngClass]="activeFilter() === tab.key 
                ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-900 dark:border-stone-100' 
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'">
              {{ tab.label }}
              @if (tab.count() > 0) {
                <span class="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                  [ngClass]="activeFilter() === tab.key 
                    ? 'bg-white/20 dark:bg-stone-900/20' 
                    : 'bg-stone-100 dark:bg-stone-700'">
                  {{ tab.count() }}
                </span>
              }
            </button>
          }
        </div>

        <!-- Notification List -->
        <div class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
          @if (filteredGroups().length === 0) {
            <div class="flex flex-col items-center justify-center px-6 py-20">
              <div class="w-20 h-20 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-5">
                <span class="material-icons-outlined text-stone-300 dark:text-stone-600 text-4xl">notifications_none</span>
              </div>
              <p class="text-stone-500 dark:text-stone-400 text-sm font-medium">No hay notificaciones</p>
              <p class="text-stone-400 dark:text-stone-500 text-xs mt-1">Te avisaremos cuando algo importante suceda</p>
            </div>
          } @else {
            @for (group of filteredGroups(); track group.label) {
              <!-- Group Header -->
              <div class="px-6 py-3 bg-stone-50/50 dark:bg-stone-800/30 border-b border-stone-100 dark:border-stone-800">
                <span class="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                  {{ group.label }}
                </span>
              </div>

              @for (notification of group.items; track notification.id; let last = $last) {
                <div 
                  class="px-6 py-4 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-all cursor-pointer group"
                  [class.bg-blue-50/30]="!notification.read"
                  [class.dark:bg-blue-900/5]="!notification.read"
                  [class.border-b]="!last"
                  [class.border-stone-100]="!last"
                  [class.dark:border-stone-800]="!last"
                  (click)="handleClick(notification)">
                  
                  <div class="flex gap-4">
                    <!-- Icon -->
                    <div [class]="getIconClass(notification.type)">
                      <span class="material-icons-outlined text-[18px]">{{ notification.icon }}</span>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start justify-between gap-3">
                        <div class="flex items-center gap-2">
                          <h3 class="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                            {{ notification.title }}
                          </h3>
                          @if (!notification.read) {
                            <span class="w-2 h-2 rounded-full shrink-0"
                              [ngClass]="{
                                'bg-rose-500': notification.priority === 'critical',
                                'bg-amber-500': notification.priority === 'important',
                                'bg-blue-400': notification.priority === 'info'
                              }"></span>
                          }
                        </div>
                        <span class="text-[11px] text-stone-400 dark:text-stone-500 whitespace-nowrap">
                          {{ formatTime(notification.timestamp) }}
                        </span>
                      </div>
                      
                      <p class="text-[13px] text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                        {{ notification.message }}
                      </p>

                      @if (notification.actionLabel) {
                        <div class="mt-2.5 flex items-center gap-3">
                          <button
                            (click)="handleAction(notification, $event)"
                            class="text-[12px] font-semibold text-stone-700 dark:text-stone-200 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all">
                            {{ notification.actionLabel }}
                          </button>
                        </div>
                      }
                    </div>

                    <!-- Delete -->
                    <button
                      (click)="deleteNotification(notification.id, $event)"
                      class="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-all opacity-0 group-hover:opacity-100 self-start"
                      title="Eliminar">
                      <span class="material-icons-outlined text-stone-400 text-[16px]">close</span>
                    </button>
                  </div>
                </div>
              }
            }
          }
        </div>
      </div>
    </div>
  `
})
export class NotificationsPageComponent {
  notificationService = inject(NotificationService);
  private router = inject(Router);

  activeFilter = signal<'all' | 'critical' | 'sales' | 'stock'>('all');

  filterTabs = [
    { key: 'all' as const, label: 'Todas', count: computed(() => this.notificationService.allNotifications().length) },
    { key: 'critical' as const, label: 'Críticas', count: computed(() => this.notificationService.criticalNotifications().length) },
    { key: 'sales' as const, label: 'Ventas', count: computed(() => this.notificationService.getByCategory('sales').length) },
    { key: 'stock' as const, label: 'Stock', count: computed(() => this.notificationService.getByCategory('stock').length) },
  ];

  filteredGroups = computed(() => {
    const groups = this.notificationService.groupedNotifications();
    const filter = this.activeFilter();
    if (filter === 'all') return groups;
    return groups
      .map(g => ({
        ...g,
        items: g.items.filter(n => {
          if (filter === 'critical') return n.priority === 'critical' || n.priority === 'important';
          if (filter === 'sales') return n.category === 'sales';
          if (filter === 'stock') return n.category === 'stock';
          return true;
        })
      }))
      .filter(g => g.items.length > 0);
  });

  handleClick(n: Notification) {
    if (!n.read) this.notificationService.markAsRead(n.id);
    if (n.actionRoute) this.router.navigate([n.actionRoute]);
  }

  handleAction(n: Notification, e: Event) {
    e.stopPropagation();
    if (n.actionRoute) {
      this.notificationService.markAsRead(n.id);
      this.router.navigate([n.actionRoute]);
    }
  }

  deleteNotification(id: string, e: Event) {
    e.stopPropagation();
    this.notificationService.remove(id);
  }

  getIconClass(type: NotificationType): string {
    const colors: Record<NotificationType, string> = {
      success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
      info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      error: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
    };
    return `w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[type]}`;
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    return timestamp.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }
}
