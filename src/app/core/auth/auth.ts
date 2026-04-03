import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models';
import { SyncService } from '../services/sync.service';
import { LocalDbService } from '../services/local-db.service';
import { supabase } from '../services/supabase.service';

/**
 * 🔐 AuthService
 * Arquitectura: Supabase-first
 * - Carga usuarios desde Supabase al iniciar
 * - IndexedDB como caché local únicamente
 * - No usa localStorage
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private router = inject(Router);
  private syncService = inject(SyncService);
  private localDb = inject(LocalDbService);

  private readonly CURRENT_USER_KEY = 'current_user';

  // Estados
  isLoadingUsers = signal(true);
  isSyncing = signal(false);
  private usersList = signal<User[]>([]);
  private currentUserSig = signal<User | null>(this.loadCurrentUserFromLocalStorage());

  constructor() {
    this.initSupabaseFirst();
  }

  /**
   * Inicializar usuarios desde Supabase (fuente de verdad)
   */
  private async initSupabaseFirst(): Promise<void> {
    // 1. Cargar cache mientras tanto
    const cached = await this.localDb.getUsers();
    if (cached && cached.length > 0) {
      this.usersList.set(cached);
      this.isLoadingUsers.set(false);
    }

    // 2. Cargar desde Supabase
    await this.loadFromSupabase();
  }

  /**
   * Cargar usuarios desde Supabase (fuente de verdad)
   */
  private async loadFromSupabase(): Promise<void> {
    if (!navigator.onLine) {
      console.log('📴 Sin conexión, usando cache');
      this.isLoadingUsers.set(false);
      return;
    }

    try {
      this.isSyncing.set(true);
      console.log('☁️ Cargando usuarios desde Supabase...');

      const { data, error } = await supabase.from('usuarios').select('*');

      if (error) {
        console.error('❌ Error cargando usuarios:', error);
        return;
      }

      if (data && data.length > 0) {
        const users = data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          pin: u.pin,
          avatar: u.avatar,
          createdAt: u.created_at ? new Date(u.created_at) : new Date(),
        }));
        
        console.log(`✅ Supabase: ${users.length} usuarios cargados`);
        this.usersList.set(users);
        await this.localDb.saveUsers(users);
      }
    } catch (error) {
      console.error('❌ Error cargando usuarios desde Supabase:', error);
    } finally {
      this.isLoadingUsers.set(false);
      this.isSyncing.set(false);
    }
  }

  /**
   * Sincronizar cambios locales hacia Supabase
   */
  private async syncToSupabase(): Promise<void> {
    try {
      this.isSyncing.set(true);
      await this.syncService.syncAll();
      console.log('✅ Usuarios sincronizados con Supabase');
    } catch (error) {
      console.error('❌ Error sincronizando usuarios:', error);
    } finally {
      this.isSyncing.set(false);
    }
  }

  /**
   * Cargar usuario actual desde localStorage (solo sesión)
   */
  private loadCurrentUserFromLocalStorage(): User | null {
    const stored = localStorage.getItem(this.CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  // Computadas
  isAuthenticated = computed(() => !!this.currentUserSig());
  currentUser = computed(() => this.currentUserSig());

  // 🔄 Signal reactivo para usuarios disponibles
  availableUsers = computed(() => this.usersList());

  // Obtener todos los usuarios disponibles (legacy - usar availableUsers signal)
  getAvailableUsers(): User[] {
    return this.usersList();
  }

  // Obtener usuarios (signal)
  getUsers() {
    return this.usersList();
  }

  // Crear nuevo usuario
  createUser(data: { name: string; role: 'admin' | 'vendor'; pin: string }): User {
    const newUser: User = {
      id: crypto.randomUUID(),
      name: data.name,
      role: data.role,
      pin: data.pin,
      createdAt: new Date(),
    };

    this.usersList.update((users) => [...users, newUser]);

    // 🔄 Sincronizar con Supabase en segundo plano
    this.syncService.queueForSync('user', 'create', newUser);
    this.localDb.saveUser(newUser);
    this.syncToSupabase();

    return newUser;
  }

  // Actualizar usuario existente
  updateUser(
    userId: string,
    data: { name: string; role: 'admin' | 'vendor'; pin: string }
  ): boolean {
    const userIndex = this.usersList().findIndex((u) => u.id === userId);
    if (userIndex === -1) return false;

    this.usersList.update((users) => {
      const updated = [...users];
      updated[userIndex] = {
        ...updated[userIndex],
        name: data.name,
        role: data.role,
        pin: data.pin,
      };
      return updated;
    });

    // 🔄 Sincronizar con Supabase
    const updatedUser = this.usersList()[userIndex];
    this.syncService.queueForSync('user', 'update', updatedUser);
    this.localDb.saveUser(updatedUser);
    this.syncToSupabase();

    return true;
  }

  // Eliminar usuario
  deleteUser(userId: string): boolean {
    if (this.currentUserSig()?.id === userId) {
      return false; // No se puede eliminar el usuario actual
    }

    this.usersList.update((users) => users.filter((u) => u.id !== userId));

    // 🔄 Sincronizar eliminación con Supabase
    this.syncService.queueForSync('user', 'delete', { id: userId });
    this.localDb.deleteUser(userId);
    this.syncToSupabase();

    return true;
  }

  // Login - seleccionar usuario por ID y PIN
  login(userId: string, pin?: string): boolean {
    const user = this.usersList().find((u) => u.id === userId);
    if (!user) return false;

    // Validar PIN si se proporciona
    if (pin !== undefined && user.pin !== pin) {
      return false; // PIN incorrecto
    }

    this.currentUserSig.set(user);
    this.saveUserToStorage(user);
    return true;
  }

  // Validar PIN de un usuario
  validatePin(userId: string, pin: string): boolean {
    const user = this.usersList().find((u) => u.id === userId);
    return user ? user.pin === pin : false;
  }

  // Cambiar de usuario sin hacer logout completo
  switchUser(userId: string): boolean {
    return this.login(userId);
  }

  // Logout
  logout() {
    this.currentUserSig.set(null);
    localStorage.removeItem(this.CURRENT_USER_KEY);
    this.router.navigate(['/login']);
  }

  // Persistencia de sesión actual (solo localStorage para sesión)
  private saveUserToStorage(user: User) {
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
  }
}
