import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpParams
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('denraf_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  get<T>(endpoint: string,
         params?: Record<string, string | number>)
      : Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        httpParams = httpParams.set(key, String(value));
      });
    }
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`, {
      headers: this.getHeaders(),
      params: httpParams
    });
  }

  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(
      `${this.baseUrl}/${endpoint}`,
      body,
      { headers: this.getHeaders() }
    );
  }

  put<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.put<T>(
      `${this.baseUrl}/${endpoint}`,
      body,
      { headers: this.getHeaders() }
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(
      `${this.baseUrl}/${endpoint}`,
      { headers: this.getHeaders() }
    );
  }
}