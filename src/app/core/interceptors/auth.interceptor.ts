import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";


export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const router = inject(Router);
  const token = localStorage.getItem('denraf_token');

  //Solo agrega token en llamadas al backend de spring boot
  const isBackendUrl = req.url.startsWith('http://localhost:8080') ||
        req.url.includes('161.35.96.206');
        
  const isAuthUrl = req.url.includes('/api/auth/');

  const authReq = token && isBackendUrl && !isAuthUrl ? req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  }) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if ((error.status === 401 || error.status === 403) && isBackendUrl) {
        localStorage.removeItem('denraf_token');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};