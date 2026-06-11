import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { ApiService } from '../../services/api.service';
import { ManagerDelivery } from '../../models/shop.models';

@Component({
  selector: 'app-emargement',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './emargement.html',
  styleUrl: './emargement.css',
})
export class Emargement implements OnInit {
  currentUser: User | null = null;
  deliveries: ManagerDelivery[] = [];
  filteredDeliveries: ManagerDelivery[] = [];
  searchQuery = '';
  loading = true;
  error = '';
  confirmingId: string | null = null;
  cartCount = 0;

  constructor(
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
    this.loadDeliveries();
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }

  loadDeliveries() {
    this.loading = true;
    this.error = '';
    this.api.getManagerDeliveries().subscribe({
      next: (deliveries) => {
        this.deliveries = deliveries;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les livraisons.';
        this.loading = false;
      },
    });
  }

  onSearchChange(event: Event) {
    this.searchQuery = (event.target as HTMLInputElement).value;
    this.applyFilter();
  }

  applyFilter() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredDeliveries = [...this.deliveries];
      return;
    }
    this.filteredDeliveries = this.deliveries.filter(
      (d) =>
        d.consumer_name.toLowerCase().includes(q) ||
        d.transaction_code.toLowerCase().includes(q)
    );
  }

  confirmHandover(delivery: ManagerDelivery) {
    if (this.confirmingId) return;
    this.confirmingId = delivery.id;
    this.api.confirmHandover(delivery.id).subscribe({
      next: () => {
        this.confirmingId = null;
        this.loadDeliveries();
      },
      error: (err) => {
        this.confirmingId = null;
        alert(err?.error?.detail || 'Erreur lors de la confirmation.');
      },
    });
  }

  formatItem(item: ManagerDelivery['items'][0]): string {
    return `${item.quantity} ${item.unit} ${item.product_name}`;
  }
}
