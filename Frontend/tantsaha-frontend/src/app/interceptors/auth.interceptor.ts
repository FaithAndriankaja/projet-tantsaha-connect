import { Injectable, Injector } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpClient,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private refreshing = false;

  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    console.log('AuthInterceptor: intercepting request:', req.url);
    const token = localStorage.getItem('access_token');
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    if (token) console.log('AuthInterceptor: added token to request');

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('AuthInterceptor: request error:', error.status, req.url);
        if (
          error.status === 401 &&
          !req.url.includes('/auth/login') &&
          !req.url.includes('/auth/register') &&
          !req.url.includes('/auth/token/refresh')
        ) {
          console.log('AuthInterceptor: 401 detected, attempting refresh');
          return this.refreshAndRetry(authReq, next);
        }
        return throwError(() => error);
      })
    );
  }

  private refreshAndRetry(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh || this.refreshing) {
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    }

    this.refreshing = true;
    const http = this.injector.get(HttpClient);
    const base = (window as any).__APP_CONFIG?.API_BASE_URL || '/api';

    return http.post<{ access: string }>(`${base}/auth/token/refresh/`, { refresh }).pipe(
      switchMap((res) => {
        this.refreshing = false;
        localStorage.setItem('access_token', res.access);
        const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${res.access}` } });
        return next.handle(retryReq);
      }),
      catchError((err) => {
        this.refreshing = false;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('currentUser');
        return throwError(() => err);
      })
    );
  }
}
