import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { ShopProduct } from '../../models/shop.models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-marketplace-produce',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './marketplace-produce.html',
  styleUrl: './marketplace-produce.css',
})
export class MarketplaceProduce implements OnInit {
  currentUser: User | null = null;
  products: ShopProduct[] = [];
  loading = true;
  error = '';
  addedProductId: string | null = null;
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
    this.loadProducts();
  }

  get userInitial(): string {
    return this.currentUser?.name?.charAt(0).toUpperCase() ?? '';
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }

  logout() {
    this.authService.logout();
  }

  loadProducts() {
    this.loading = true;
    this.error = '';
    this.api.getShop().subscribe({
      next: (products) => {
        this.products = products;
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger le catalogue. Vérifiez que le backend est démarré.';
        this.loading = false;
      },
    });
  }

  formatPrice(value: string | number): string {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('fr-MG').format(n);
  }

  addToCart(product: ShopProduct) {
    this.cart.addProduct(product);
    this.addedProductId = product.product_id;
    setTimeout(() => {
      if (this.addedProductId === product.product_id) {
        this.addedProductId = null;
      }
    }, 2000);
  }

  isOutOfStock(product: ShopProduct): boolean {
    return parseFloat(product.remaining_quantity) <= 0;
  }
}
