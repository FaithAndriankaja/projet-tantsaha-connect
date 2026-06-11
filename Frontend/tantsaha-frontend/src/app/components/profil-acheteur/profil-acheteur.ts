import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { OrderSummary } from '../../models/shop.models';

@Component({
  selector: 'app-profil-acheteur',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './profil-acheteur.html',
  styleUrl: './profil-acheteur.css',
})
export class ProfilAcheteur implements OnInit {
  currentUser: User | null = null;
  orders: OrderSummary[] = [];
  loading = true;
  error = '';
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
    this.loadOrders();
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }

  loadOrders() {
    this.loading = true;
    this.error = '';
    this.api.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger vos commandes.';
        this.loading = false;
      },
    });
  }

  logout() {
    this.authService.logout();
  }

  formatPrice(value: string): string {
    return new Intl.NumberFormat('fr-MG').format(parseFloat(value));
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending_payment: 'En attente paiement',
      payment_submitted: 'Paiement envoyé',
      confirmed: 'Confirmée',
      ready: 'Prête',
      picked_up: 'Récupérée',
      cancelled: 'Annulée',
    };
    return labels[status] ?? status;
  }

  statusClass(status: string): string {
    if (status === 'picked_up' || status === 'confirmed') return 'bg-success/10 text-success';
    if (status === 'cancelled') return 'bg-error/10 text-error';
    return 'bg-warning/10 text-warning';
  }
}
