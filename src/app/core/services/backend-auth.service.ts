import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { User } from '../models';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  nombre: string;
  rol: string;
  expiresIn: number;
}

@Injectable({
  providedIn: 'root'
})
export class BackendAuthService {

  private api = inject(ApiService);

  // Estado del usuario autenticado
  currentUser = signal<AuthResponse | null>(
      this.loadUserFromStorage());

  login(credentials: LoginRequest)
      : Observable<AuthResponse> {
    return this.api.post<AuthResponse>(
        'auth/login', credentials)
      .pipe(
        tap(response => {
          localStorage.setItem(
              'denraf_token', response.token);
          localStorage.setItem(
              'denraf_backend_user',
              JSON.stringify(response));
          this.currentUser.set(response);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('denraf_token');
    localStorage.removeItem('denraf_backend_user');
    this.currentUser.set(null);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('denraf_token');
  }

  isAdmin(): boolean {
    return this.currentUser()?.rol === 'ADMIN';
  }

  private loadUserFromStorage(): AuthResponse | null {
    const stored = localStorage.getItem(
        'denraf_backend_user');
    return stored ? JSON.parse(stored) : null;
  }
}