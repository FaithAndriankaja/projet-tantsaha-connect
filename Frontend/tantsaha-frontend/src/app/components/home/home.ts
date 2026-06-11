import { Component, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { PickupPoint } from '../../models/shop.models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, AfterViewInit {
  currentUser: User | null = null;
  pickupPoints: PickupPoint[] = [];
  cartCount = 0;

  constructor(
    private el: ElementRef,
    private authService: AuthService,
    private api: ApiService,
    private cart: CartService
  ) {}

  ngOnInit() {
    this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
    });
    this.cart.items$.subscribe((items) => {
      this.cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
    });
    this.api.getPickupPoints().subscribe({
      next: (points) => {
        this.pickupPoints = points;
      },
    });
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }

  logout() {
    this.authService.logout();
  }

  ngAfterViewInit() {
    const timerElement = this.el.nativeElement.querySelector('#countdown');
    if (timerElement) {
      let timeLeft = 24 * 60 * 60;
      const updateTimer = () => {
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        if (timeLeft > 0) timeLeft--;
      };
      setInterval(updateTimer, 1000);
      updateTimer();
    }

    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const animatedElements = this.el.nativeElement.querySelectorAll('.fade-in-section');
    animatedElements.forEach((el: HTMLElement) => observer.observe(el));
  }
}
