import { Component, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnInit, AfterViewInit {
  currentUser: User | null = null;

  constructor(
    private el: ElementRef, 
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  ngAfterViewInit() {
    // Back button logic for mobile
    const mobileBackBtn = this.el.nativeElement.querySelector('.mobile-back-btn');
    if (mobileBackBtn) {
      mobileBackBtn.addEventListener('click', () => window.history.back());
    }

    // Simple micro-interaction for item quantity
    const quantityContainers = this.el.nativeElement.querySelectorAll('.quantity-selector');
    quantityContainers.forEach((container: HTMLElement) => {
      const span = container.querySelector('span');
      const minusBtn = container.querySelector('.minus-btn') as HTMLButtonElement;
      const plusBtn = container.querySelector('.plus-btn') as HTMLButtonElement;

      if (span && minusBtn && plusBtn) {
        minusBtn.addEventListener('click', () => {
          let val = parseInt(span.textContent || '0');
          if (val > 1) span.textContent = (val - 1).toString();
        });

        plusBtn.addEventListener('click', () => {
          let val = parseInt(span.textContent || '0');
          span.textContent = (val + 1).toString();
        });
      }
    });

    // Form logic for neighborhood selection and address
    const confirmBtn = this.el.nativeElement.querySelector('.confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="animate-spin mr-2">◌</span> Traitement...';
        setTimeout(() => {
          this.router.navigate(['/panier-paiement']);
        }, 1500);
      });
    }
  }
}
