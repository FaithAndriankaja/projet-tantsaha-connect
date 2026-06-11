import { Injectable, Injector } from '@angular/core';
import { AuthService } from '../services/auth.service';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpClient,
} from '@angular/common/http';
import { Observable, firstValueFrom, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private refreshPromise: Promise<string> | null = null;

  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('access_token');
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (
          error.status === 401 &&
          !req.url.includes('/auth/login') &&
          !req.url.includes('/auth/register') &&
          !req.url.includes('/auth/token/refresh')
        ) {
          return this.refreshAndRetry(authReq, next);
        }
        return throwError(() => error);
      })
    );
  }

  private refreshAndRetry(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
      this.clearSession();
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    }

    return from(this.refreshAccessToken(refresh)).pipe(
      switchMap((access) => {
        const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${access}` } });
        return next.handle(retryReq);
      }),
      catchError((err) => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  private refreshAccessToken(refresh: string): Promise<string> {
    if (!this.refreshPromise) {
      const http = this.injector.get(HttpClient);
      const base = (window as any).__APP_CONFIG?.API_BASE_URL || '/api';

      this.refreshPromise = firstValueFrom(
        http.post<{ access: string }>(`${base}/auth/token/refresh/`, { refresh })
      )
        .then((res) => {
          const access = res?.access;
          if (!access) {
            throw new Error('NO_ACCESS_TOKEN');
          }
          localStorage.setItem('access_token', access);
          return access;
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }

    return this.refreshPromise;
  }

  private clearSession(): void {
    this.injector.get(AuthService).clearSession();
  }
}
