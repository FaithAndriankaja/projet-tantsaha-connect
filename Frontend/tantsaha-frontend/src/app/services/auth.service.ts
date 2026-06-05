import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: string;
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

  constructor() {
    const savedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(savedUser ? JSON.parse(savedUser) : null);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // Mock Login
  login(email: string, password: string): Observable<User> {
    // In a real app, this would be an API call
    return new Observable(subscriber => {
      setTimeout(() => {
        const mockUser: User = {
          id: '1',
          email: email,
          role: 'mpanjifa', // Default for mock login
          name: email.split('@')[0]
        };
        localStorage.setItem('currentUser', JSON.stringify(mockUser));
        this.currentUserSubject.next(mockUser);
        subscriber.next(mockUser);
        subscriber.complete();
      }, 1000);
    });
  }

  // Mock Register
  register(userData: any): Observable<User> {
    return new Observable(subscriber => {
      setTimeout(() => {
        const newUser: User = {
          id: Math.random().toString(36).substr(2, 9),
          email: userData.email,
          role: userData.role || 'mpanjifa',
          name: userData.name || userData.email.split('@')[0]
        };
        // In mocking, we just auto-login after register
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        this.currentUserSubject.next(newUser);
        subscriber.next(newUser);
        subscriber.complete();
      }, 1500);
    });
  }

  logout() {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserValue;
  }
}
