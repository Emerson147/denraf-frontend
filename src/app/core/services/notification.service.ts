import { Injectable, signal, computed, inject } from '@angular/core';
import { LoggerService } from './logger.service';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationPriority = 'critical' | 'important' | 'info';
export type NotificationCategory = 'stock' | 'sales' | 'goals' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon?: string;
  actionLabel?: string;
  actionRoute?: string;
  /** Key for deduplication — same key won't be added twice per session */
  dedupeKey?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private logger = inject(LoggerService);
  private readonly STORAGE_KEY = 'denraf-notifications';
  private notifications = signal<Notification[]>([]);
  
  /** Track deduplication keys for this session */
  private sessionDedupeKeys = new Set<string>();

  // ─── Computed signals ──────────────────────────────────────
  allNotifications = computed(() => this.notifications());
  unreadNotifications = computed(() => this.notifications().filter(n => !n.read));
  unreadCount = computed(() => this.unreadNotifications().length);
  
  /** Recent notifications for the slide-over panel */
  recentNotifications = computed(() => this.notifications().slice(0, 20));

  /** Grouped by date: today, yesterday, this week, older */
  groupedNotifications = computed(() => {
    const all = this.notifications();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

    const groups: { label: string; items: Notification[] }[] = [];
    
    const todayItems = all.filter(n => n.timestamp >= today);
    const yesterdayItems = all.filter(n => n.timestamp >= yesterday && n.timestamp < today);
    const weekItems = all.filter(n => n.timestamp >= weekAgo && n.timestamp < yesterday);
    const olderItems = all.filter(n => n.timestamp < weekAgo);

    if (todayItems.length) groups.push({ label: 'Hoy', items: todayItems });
    if (yesterdayItems.length) groups.push({ label: 'Ayer', items: yesterdayItems });
    if (weekItems.length) groups.push({ label: 'Esta semana', items: weekItems });
    if (olderItems.length) groups.push({ label: 'Anteriores', items: olderItems });

    return groups;
  });

  /** Filter by category */
  getByCategory(category: NotificationCategory) {
    return this.notifications().filter(n => n.category === category);
  }

  /** Critical + important only */
  criticalNotifications = computed(() => 
    this.notifications().filter(n => n.priority === 'critical' || n.priority === 'important')
  );

  constructor() {
    this.loadFromLocalStorage();
  }

  // ─── Add notification with deduplication ───────────────────
  add(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    // Deduplication check
    if (notification.dedupeKey) {
      if (this.sessionDedupeKeys.has(notification.dedupeKey)) {
        return null; // Already added this session
      }
      this.sessionDedupeKeys.add(notification.dedupeKey);
    }

    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false
    };

    this.notifications.update(current => [newNotification, ...current]);
    this.saveToLocalStorage();
    
    return newNotification.id;
  }

  // ─── Convenience methods ───────────────────────────────────
  success(title: string, message: string, options?: { 
    actionLabel?: string; actionRoute?: string; 
    category?: NotificationCategory; dedupeKey?: string 
  }) {
    return this.add({
      type: 'success', priority: 'info',
      category: options?.category || 'system',
      title, message, icon: 'check_circle',
      actionLabel: options?.actionLabel,
      actionRoute: options?.actionRoute,
      dedupeKey: options?.dedupeKey
    });
  }

  info(title: string, message: string, options?: { 
    actionLabel?: string; actionRoute?: string; 
    category?: NotificationCategory; dedupeKey?: string 
  }) {
    return this.add({
      type: 'info', priority: 'info',
      category: options?.category || 'system',
      title, message, icon: 'info',
      actionLabel: options?.actionLabel,
      actionRoute: options?.actionRoute,
      dedupeKey: options?.dedupeKey
    });
  }

  warning(title: string, message: string, options?: { 
    actionLabel?: string; actionRoute?: string; 
    category?: NotificationCategory; priority?: NotificationPriority; dedupeKey?: string 
  }) {
    return this.add({
      type: 'warning', priority: options?.priority || 'important',
      category: options?.category || 'system',
      title, message, icon: 'warning',
      actionLabel: options?.actionLabel,
      actionRoute: options?.actionRoute,
      dedupeKey: options?.dedupeKey
    });
  }

  error(title: string, message: string, options?: { 
    actionLabel?: string; actionRoute?: string; 
    category?: NotificationCategory; dedupeKey?: string 
  }) {
    return this.add({
      type: 'error', priority: 'critical',
      category: options?.category || 'system',
      title, message, icon: 'error',
      actionLabel: options?.actionLabel,
      actionRoute: options?.actionRoute,
      dedupeKey: options?.dedupeKey
    });
  }

  // ─── Actions ───────────────────────────────────────────────
  markAsRead(id: string) {
    this.notifications.update(current =>
      current.map(n => n.id === id ? { ...n, read: true } : n)
    );
    this.saveToLocalStorage();
  }

  markAllAsRead() {
    this.notifications.update(current =>
      current.map(n => ({ ...n, read: true }))
    );
    this.saveToLocalStorage();
  }

  remove(id: string) {
    this.notifications.update(current =>
      current.filter(n => n.id !== id)
    );
    this.saveToLocalStorage();
  }

  clearRead() {
    this.notifications.update(current =>
      current.filter(n => !n.read)
    );
    this.saveToLocalStorage();
  }

  clearAll() {
    this.notifications.set([]);
    this.saveToLocalStorage();
  }

  // ─── Persistence ───────────────────────────────────────────
  private saveToLocalStorage() {
    try {
      // Keep max 100 notifications
      const toSave = this.notifications().slice(0, 100);
      const data = toSave.map(n => ({
        ...n,
        timestamp: n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      this.logger.error('Error saving notifications:', error);
    }
  }

  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const notifications = data.map((n: any) => ({
          ...n,
          priority: n.priority || 'info',
          category: n.category || 'system',
          timestamp: new Date(n.timestamp)
        }));
        this.notifications.set(notifications);
      }
    } catch (error) {
      this.logger.error('Error loading notifications:', error);
      this.notifications.set([]);
    }
  }

  private generateId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
