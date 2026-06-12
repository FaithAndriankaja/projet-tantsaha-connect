import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { HarvestLine } from '../../models/shop.models';

@Component({
  selector: 'app-farmer-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './farmer-dashboard.html',
  styleUrl: './farmer-dashboard.css',
})
export class FarmerDashboard implements OnInit {
  currentUser: User | null = null;
  harvestLines: HarvestLine[] = [];
  loading = true;
  error = '';

  constructor(
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
    this.loadHarvestSheet();
  }

  loadHarvestSheet() {
    this.loading = true;
    this.error = '';
    this.api.getHarvestSheet().subscribe({
      next: (lines) => {
        this.harvestLines = lines;
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger la feuille de récolte.';
        this.loading = false;
      },
    });
  }

  get farmName(): string {
    return this.harvestLines[0]?.farm_name ?? 'Ma ferme';
  }

  get totalOrders(): number {
    return this.harvestLines.reduce((sum, line) => sum + line.order_count, 0);
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }

  get currentDate(): Date {
    return new Date();
  }

  isSidePanelOpen = false;

  toggleSidePanel() {
    this.isSidePanelOpen = !this.isSidePanelOpen;
  }

  cartCount = 0;

  get totalProducts(): number {
    return this.harvestLines.length;
  }

  get totalQuantity(): number {
    return this.harvestLines.reduce((sum, line) => sum + parseFloat(line.total_quantity_to_prepare as unknown as string), 0);
  }

  formatQty(value: string): string {
    return parseFloat(value).toLocaleString('fr-FR');
  }
}
