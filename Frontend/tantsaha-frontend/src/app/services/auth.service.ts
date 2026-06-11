import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
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
    const savedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(savedUser ? JSON.parse(savedUser) : null);
    this.currentUser = this.currentUserSubject.asObservable();
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
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
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
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
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
}
