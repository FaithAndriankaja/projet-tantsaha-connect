import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NotificationService } from './services/notification.service';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {

  protected readonly title = signal('tantsaha-frontend');

  showLogoutModal = false;
  private sub?: Subscription;

  constructor(
    public notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.sub = this.authService.logoutRequest$.subscribe(() => {
      this.showLogoutModal = true;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  confirmLogout(): void {
    this.showLogoutModal = false;
    this.authService.logout(true);
    this.router.navigate(['/login']);
  }

  cancelLogout(): void {
    this.showLogoutModal = false;
  }
}