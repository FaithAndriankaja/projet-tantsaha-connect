import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { ApiService } from './api.service';

export interface User {
  id: string;
  phone: string;
  email: string;
  role: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor(private api: ApiService) {
    this.currentUserSubject = new BehaviorSubject<User | null>(this.readStoredUser());
    this.currentUser = this.currentUserSubject.asObservable();
    this.syncSession();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(phone: string, password: string): Observable<any> {
    return this.api.loginPhone(phone, password).pipe(tap((res) => this.storeSession(res, phone)));
  }

  register(userData: {
    phone: string;
    password: string;
    full_name: string;
    email?: string;
    role: string;
    farm_name?: string;
    location?: string;
  }): Observable<any> {
    return this.api.register(userData).pipe(tap((res) => this.storeSession(res, userData.phone)));
  }

  logout() {
    this.clearSession();
  }

  clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  syncSession(): void {
    const hasToken = this.isLoggedIn();
    const user = this.currentUserSubject.value;
    if (user && !hasToken) {
      this.clearSession();
    }
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  ensureValidToken(): Observable<void> {
    const token = this.getAccessToken();
    if (!token) {
      this.clearSession();
      return throwError(() => new Error('NO_TOKEN'));
    }

    const payload = this.decodeToken(token);
    const expiresAt = payload.exp ? payload.exp * 1000 : 0;
    if (!expiresAt || Date.now() < expiresAt - 30_000) {
      return of(undefined);
    }

    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
      this.clearSession();
      return throwError(() => new Error('NO_REFRESH'));
    }

    return this.api.refreshToken(refresh).pipe(
      tap((res) => localStorage.setItem('access_token', res.access)),
      map(() => undefined),
      catchError((err) => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isProducer(): boolean {
    return this.currentUserValue?.role === 'tantsaha';
  }

  isManager(): boolean {
    return this.currentUserValue?.role === 'mpandrindra';
  }

  isConsumer(): boolean {
    const role = this.currentUserValue?.role;
    return role === 'mpanjifa' || role === 'consumer';
  }

  getProfileRoute(): string {
    const role = this.currentUserValue?.role;
    if (role === 'tantsaha') return '/tantsaha-ferme';
    if (role === 'mpandrindra') return '/mpandrindra-livraison';
    return '/profil-acheteur';
  }

  getOrdersRoute(): string {
    const role = this.currentUserValue?.role;
    if (role === 'tantsaha') return '/tantsaha-recolte';
    if (role === 'mpandrindra') return '/mpandrindra-livraison';
    return '/mes-commandes';
  }

  getDefaultRouteAfterAuth(): string {
    const role = this.currentUserValue?.role;
    if (role === 'tantsaha') return '/tantsaha-recolte';
    if (role === 'mpandrindra') return '/mpandrindra-livraison';
    return '/boutique-desktop';
  }

  private storeSession(res: any, phone: string): void {
    localStorage.setItem('access_token', res.access);
    localStorage.setItem('refresh_token', res.refresh);

    const apiUser = res.user;
    const payload = this.decodeToken(res.access);
    const user: User = {
      id: apiUser?.id || payload.user_id || '',
      phone: apiUser?.phone || phone,
      email: apiUser?.email || '',
      role: this.mapRole(apiUser?.role || payload.role || 'consumer'),
      name: apiUser?.full_name || payload.name || phone,
    };

    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) {
        return {};
      }
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      return JSON.parse(atob(padded));
    } catch {
      return {};
    }
  }

  private mapRole(role: string): string {
    if (role === 'producer') return 'tantsaha';
    if (role === 'manager') return 'mpandrindra';
    if (role === 'consumer') return 'mpanjifa';
    return role;
  }

  private readStoredUser(): User | null {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
      return null;
    }
    try {
      return JSON.parse(savedUser) as User;
    } catch {
      return null;
    }
  }
}
