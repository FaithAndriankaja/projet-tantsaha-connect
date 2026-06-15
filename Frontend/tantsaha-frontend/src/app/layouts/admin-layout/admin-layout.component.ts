import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="flex h-screen bg-[#F8FAFC]">
      <!-- Mpandrindra Sidebar -->
      <aside class="w-72 bg-slate-900 text-white flex flex-col p-6 z-50">
        <div class="flex items-center gap-3 mb-12">
          <div class="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1">eco</span>
          </div>
          <div>
            <h1 class="text-lg font-black tracking-tighter leading-none">Tantsaha</h1>
            <p class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Plateforme Coordinateur</p>
          </div>
        </div>

        <nav class="flex-grow space-y-2">
          <a routerLink="/admin/dashboard" routerLinkActive="bg-emerald-600 text-white" class="flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-white transition-all group">
            <span class="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">grid_view</span>
            <span class="text-sm font-bold">Dashboard Global</span>
          </a>
          <a routerLink="/admin/marches" routerLinkActive="bg-emerald-600 text-white" class="flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-white transition-all group">
            <span class="material-symbols-outlined text-[20px]">timer</span>
            <span class="text-sm font-bold">Marchés Éphémères</span>
          </a>
          <a routerLink="/admin/logistique" routerLinkActive="bg-emerald-600 text-white" class="flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-white transition-all group">
            <span class="material-symbols-outlined text-[20px]">local_shipping</span>
            <span class="text-sm font-bold">Groupage Camion</span>
          </a>
          <a routerLink="/admin/validation" routerLinkActive="bg-emerald-600 text-white" class="flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-white transition-all group">
            <span class="material-symbols-outlined text-[20px]">qr_code_scanner</span>
            <span class="text-sm font-bold">Collecte Terrain</span>
          </a>
        </nav>

        <div class="pt-6 border-t border-slate-800">
           <button (click)="logout()" class="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all">
            <span class="material-symbols-outlined text-[20px]">logout</span>
            <span class="text-sm font-bold">Déconnexion</span>
          </button>
        </div>
      </aside>

      <main class="flex-1 overflow-y-auto">
        <header class="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-40">
           <h2 class="text-lg font-bold text-slate-900">Interface de Coordination</h2>
           <div class="flex items-center gap-6">
              <div class="flex items-center gap-3">
                 <div class="text-right">
                    <p class="text-xs font-bold text-slate-900">M. Rabe</p>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Coordinateur Zone Est</p>
                 </div>
                 <div class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200"></div>
              </div>
           </div>
        </header>

        <div class="p-10">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [``]
})
export class AdminLayout {
  constructor(private authService: AuthService, private router: Router) {}

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
