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
  ) { }

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

  // Utilise la méthode centralisée de votre AuthService pour rediriger vers /tantsaha/dashboard ou /mpandrindra/dashboard
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
    // Gestion du compte à rebours par blocs (Jours, Heures, Minutes)
    const daysEl = this.el.nativeElement.querySelector('#days');
    const hoursEl = this.el.nativeElement.querySelector('#hours');
    const minutesEl = this.el.nativeElement.querySelector('#minutes');

    if (daysEl && hoursEl && minutesEl) {
      // Configuration initiale : 2 jours, 14 heures, 45 minutes convertis en secondes
      let timeLeft = (2 * 24 * 3600) + (14 * 3600) + (45 * 60);

      const updateTimer = () => {
        if (timeLeft <= 0) {
          daysEl.textContent = '00';
          hoursEl.textContent = '00';
          minutesEl.textContent = '00';
          return;
        }

        const days = Math.floor(timeLeft / (24 * 3600));
        const hours = Math.floor((timeLeft % (24 * 3600)) / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);

        daysEl.textContent = days.toString().padStart(2, '0');
        hoursEl.textContent = hours.toString().padStart(2, '0');
        minutesEl.textContent = minutes.toString().padStart(2, '0');

        timeLeft--;
      };

      setInterval(updateTimer, 1000);
      updateTimer();
    }

    // Gestion des animations d'apparition au défilement (Intersection Observer)
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
