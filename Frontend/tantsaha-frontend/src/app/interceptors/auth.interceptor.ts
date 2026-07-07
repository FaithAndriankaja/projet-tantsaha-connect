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
import { Observable, firstValueFrom, from, throwError, TimeoutError } from 'rxjs';
import { catchError, switchMap, timeout } from 'rxjs/operators';
import { NotificationService } from '../services/notification.service';

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/resend-verification-code',
  '/auth/password-reset-request',
  '/auth/password-reset-confirm',
  '/auth/token/refresh',
];

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private refreshPromise: Promise<string> | null = null;

  constructor(private injector: Injector) { }

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const isPublicAuth = PUBLIC_AUTH_PATHS.some((path) => req.url.includes(path));
    const token = isPublicAuth ? null : localStorage.getItem('access_token');
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    let handler = next.handle(authReq);

    // Apply a resilient 5s timeout on auth-specific routes to prevent infinite loading
    if (isPublicAuth) {
      handler = handler.pipe(timeout(10000));
    }

    return handler.pipe(
      catchError((error: HttpErrorResponse | TimeoutError | any) => {
        if (error instanceof HttpErrorResponse && error.status === 401 && !isPublicAuth) {
          return this.refreshAndRetry(authReq, next);
        }

        // Global Error display
        let errorMsg = 'Une erreur réseau ou serveur est survenue.';

        if (error instanceof TimeoutError || error.name === 'TimeoutError') {
          errorMsg = 'Délai d\'attente dépassé (10s). Le serveur met trop de temps à répondre.';
          this.injector.get(NotificationService).showError(errorMsg);
          return throwError(() => error);
        }

        if (error.status === 401 || error.status === 403) {
          errorMsg = 'Session expirée ou action non autorisée.';
        } else if (error.status >= 500) {
          errorMsg = 'Erreur interne du serveur (500). Veuillez réessayer plus tard.';
        }

        const errObj = error.error as any;
        if (errObj) {
          if (typeof errObj === 'string') {
            errorMsg = errObj;
          } else if (errObj.detail) {
            errorMsg = errObj.detail;
          } else if (errObj.message) {
            errorMsg = errObj.message;
          } else if (errObj.non_field_errors && Array.isArray(errObj.non_field_errors)) {
            errorMsg = errObj.non_field_errors[0];
          } else if (error.status === 400 && Object.values(errObj).length > 0) {
            const firstKey = Object.values(errObj)[0];
            if (Array.isArray(firstKey)) {
              errorMsg = firstKey[0];
            } else if (typeof firstKey === 'string') {
              errorMsg = firstKey;
            }
          }
        }

        this.injector.get(NotificationService).showError(errorMsg);
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
