import { Component, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-marketplace-produce',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './marketplace-produce.html',
  styleUrl: './marketplace-produce.css',
})
export class MarketplaceProduce implements OnInit, AfterViewInit {
  currentUser: User | null = null;

  constructor(private el: ElementRef, private authService: AuthService) {}

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  get userInitial(): string {
    return this.currentUser?.name?.charAt(0).toUpperCase() ?? '';
  }

  logout() {
    this.authService.logout();
  }

  ngAfterViewInit() {
    // Micro-interaction for filter category buttons
    const categoryButtons = this.el.nativeElement.querySelectorAll('.glass-card .flex.flex-wrap button');
    categoryButtons.forEach((btn: HTMLButtonElement) => {
      btn.addEventListener('click', () => {
        // Toggle selection state
        if (btn.textContent === 'Tout') return; 
        
        const isActive = btn.classList.contains('bg-primary');
        if (isActive) {
          btn.classList.remove('bg-primary', 'text-on-primary');
          btn.classList.add('bg-white', 'text-on-surface-variant', 'border-outline-variant/30');
        } else {
          btn.classList.add('bg-primary', 'text-on-primary');
          btn.classList.remove('bg-white', 'text-on-surface-variant', 'border-outline-variant/30');
        }
      });
    });

    // Add to cart toast simulation
    const addToCartButtons = this.el.nativeElement.querySelectorAll('section .grid button');
    addToCartButtons.forEach((btn: HTMLButtonElement) => {
      btn.addEventListener('click', () => {
        const originalText = btn.textContent || '';
        btn.innerHTML = '<span class="material-symbols-outlined text-lg mr-2">check_circle</span>Ajouté !';
        btn.classList.add('bg-primary', 'text-on-primary');
        btn.classList.remove('bg-surface-container', 'text-primary');
        
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('bg-primary', 'text-on-primary');
          btn.classList.add('bg-surface-container', 'text-primary');
        }, 2000);
      });
    });
  }
}
