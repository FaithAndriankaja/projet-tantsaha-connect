import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-farmer-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="min-h-screen bg-[#F9FAFB] pb-24">
      <header class="h-16 px-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-40">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-emerald-600">eco</span>
          <h1 class="font-bold text-slate-900 tracking-tight">Tantsaha Connect</h1>
        </div>
        <div class="flex items-center gap-3">
          <button class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
            <span class="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <button (click)="logout()" class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
            <span class="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </header>

      <main class="animate-in fade-in duration-500">
        <router-outlet></router-outlet>
      </main>

      <!-- Mobile Bottom Navigation -->
      <nav class="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 px-6 py-3 flex justify-between items-center z-50 safe-area-inset-bottom">
        <a routerLink="/tantsaha-recolte" routerLinkActive="text-emerald-600" [routerLinkActiveOptions]="{exact: true}" class="flex flex-col items-center gap-1 group">
          <span class="material-symbols-outlined group-active:scale-95 transition-transform" [class.active-tab]="">dashboard</span>
          <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-[.text-emerald-600]:text-emerald-600">Accueil</span>
        </a>
        <a routerLink="/tantsaha-produits" routerLinkActive="text-emerald-600" class="flex flex-col items-center gap-1 group">
          <span class="material-symbols-outlined group-active:scale-95 transition-transform">inventory_2</span>
          <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-[.text-emerald-600]:text-emerald-600">Stocks</span>
        </a>
        
        <!-- Center Action Button -->
        <button (click)="openQR()" class="w-14 h-14 -mt-10 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200 flex items-center justify-center active:scale-90 transition-transform">
          <span class="material-symbols-outlined text-[28px]">qr_code_scanner</span>
        </button>

        <a routerLink="/tantsaha-commandes" routerLinkActive="text-emerald-600" class="flex flex-col items-center gap-1 group">
          <span class="material-symbols-outlined group-active:scale-95 transition-transform">local_shipping</span>
          <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-[.text-emerald-600]:text-emerald-600">Livrer</span>
        </a>
        <a routerLink="/profile" routerLinkActive="text-emerald-600" class="flex flex-col items-center gap-1 group">
          <span class="material-symbols-outlined group-active:scale-95 transition-transform">person</span>
          <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-[.text-emerald-600]:text-emerald-600">Profil</span>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class FarmerLayout {
  constructor(private authService: AuthService, private router: Router) {}

  openQR() {
    console.log('FarmerLayout: Open QR Validation');
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
