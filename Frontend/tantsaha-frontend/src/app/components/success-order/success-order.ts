import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { CreatedOrder } from '../../models/shop.models';

@Component({
  selector: 'app-success-order',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './success-order.html',
  styleUrl: './success-order.css',
})
export class SuccessOrder implements OnInit {
  currentUser: User | null = null;
  order: CreatedOrder | null = null;
  orderId = '';
  pickupPoint = '';
  qrCodeUrl = '';
  cartCount = 0;

  constructor(
    private authService: AuthService,
    private cart: CartService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
    });
    this.cart.items$.subscribe((items) => {
      this.cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
    });

    this.order = this.cart.getLastOrder();
    if (!this.order) {
      this.router.navigate(['/']);
      return;
    }

    this.orderId = this.order.transaction_code;
    this.pickupPoint = this.order.pickup_point_name ?? 'Point de collecte';

    const qrData = JSON.stringify({
      orderId: this.order.transaction_code,
      client: this.currentUser?.name || 'Client',
      pickup: this.pickupPoint,
    });
    this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }

  get itemsSummary(): string {
    if (!this.order?.items?.length) return '—';
    return this.order.items.map((i) => i.product_name ?? 'Article').join(', ');
  }

  formatPrice(value: string): string {
    return new Intl.NumberFormat('fr-MG').format(parseFloat(value));
  }

  async downloadPass() {
    try {
      const response = await fetch(this.qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Pass_Retrait_${this.orderId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Impossible de télécharger le pass pour le moment. Veuillez réessayer.');
    }
  }
}
