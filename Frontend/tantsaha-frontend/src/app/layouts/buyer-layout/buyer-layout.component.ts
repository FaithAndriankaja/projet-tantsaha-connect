import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-buyer-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="min-h-screen bg-[#F0F2F5]">
      <!-- Sticky Buyer Header -->
      <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 h-20 flex items-center justify-between">
        <div class="flex items-center gap-8">
          <div class="flex items-center gap-2 cursor-pointer" routerLink="/">
            <div class="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <span class="material-symbols-outlined">eco</span>
            </div>
            <span class="text-xl font-black text-slate-900 tracking-tighter">Tantsaha <span class="text-emerald-600">Connect</span></span>
          </div>

          <!-- Flash Sale Banner (Marché Éphémère) -->
          <div class="hidden lg:flex items-center gap-3 px-4 py-2 bg-orange-50 rounded-full border border-orange-100">
            <span class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span class="text-xs font-black text-orange-700 uppercase tracking-widest">Marché Éphémère Actif</span>
            <div class="h-4 w-px bg-orange-200"></div>
            <span class="text-xs font-mono font-bold text-orange-900">14:52:03 restant</span>
          </div>
        </div>

        <nav class="flex items-center gap-6">
          <a routerLink="/boutique-desktop" routerLinkActive="text-emerald-600" class="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">Marché</a>
          
          <ng-container *ngIf="currentUser">
            <a routerLink="/mes-commandes" routerLinkActive="text-emerald-600" class="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">Commandes</a>
          </ng-container>
          
          <div class="w-px h-6 bg-slate-100"></div>
          
          <!-- Auth State Section -->
          <ng-container *ngIf="!currentUser">
            <div class="flex items-center gap-4">
              <button routerLink="/login" class="text-sm font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Connexion</button>
              <button routerLink="/register" class="h-10 px-6 rounded-xl bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all">S'inscrire</button>
            </div>
          </ng-container>

          <ng-container *ngIf="currentUser">
            <div class="flex items-center gap-6">
              <button routerLink="/panier-recap" class="relative w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
                <span class="material-symbols-outlined">shopping_cart</span>
                <span *ngIf="cartCount > 0" class="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-4 ring-white">
                  {{ cartCount }}
                </span>
              </button>
              
              <div class="flex items-center gap-2">
                <button [routerLink]="profileRoute" class="flex items-center gap-3 pl-2 pr-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full hover:border-emerald-200 transition-all group">
                  <div class="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 font-black text-[10px]">
                    {{ currentUser.name.charAt(0).toUpperCase() }}
                  </div>
                  <span class="text-[10px] font-black text-slate-600 group-hover:text-slate-900 uppercase tracking-widest">Mon Profil</span>
                </button>
                
                <button (click)="logout()" class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all" title="Déconnexion">
                  <span class="material-symbols-outlined text-[20px]">logout</span>
                </button>
              </div>
            </div>
          </ng-container>
        </nav>
      </header>

      <main class="max-w-7xl mx-auto py-10 px-6">
        <router-outlet></router-outlet>
      </main>

      <footer class="bg-white border-t border-slate-100 py-12 px-6">
        <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
           <div class="space-y-4">
              <div class="flex items-center gap-2 justify-center md:justify-start">
                <span class="material-symbols-outlined text-emerald-600">eco</span>
                <span class="font-black text-slate-900 tracking-tighter">Tantsaha Connect</span>
              </div>
              <p class="text-sm text-slate-500 leading-relaxed">Solution logistique communautaire pour l'agriculture à Madagascar.</p>
           </div>
        </div>
      </footer>
    </div>
  `,
  styles: [``]
})
export class BuyerLayout implements OnInit {
  currentUser: User | null = null;
  cartCount = 0;

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.cartService.items$.subscribe(items => {
      this.cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
    });
  }

  get profileRoute() {
    return this.authService.getProfileRoute();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
