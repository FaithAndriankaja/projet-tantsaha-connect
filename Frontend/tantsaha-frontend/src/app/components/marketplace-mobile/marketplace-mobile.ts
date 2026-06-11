import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { ShopProduct } from '../../models/shop.models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-marketplace-mobile',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './marketplace-mobile.html',
  styleUrl: './marketplace-mobile.css',
})
export class MarketplaceMobile implements OnInit {
  currentUser: User | null = null;
  products: ShopProduct[] = [];
  loading = true;
  error = '';
  quantities: Record<string, number> = {};
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

  loadProducts() {
    this.loading = true;
    this.api.getShop().subscribe({
      next: (products) => {
        this.products = products;
        products.forEach((p) => {
          this.quantities[p.product_id] = 1;
        });
        this.loading = false;
      },
      error: () => {
        this.error = 'Catalogue indisponible.';
        this.loading = false;
      },
    });
  }

  formatPrice(value: string): string {
    return new Intl.NumberFormat('fr-MG').format(parseFloat(value));
  }

  changeQty(productId: string, delta: number) {
    const current = this.quantities[productId] ?? 1;
    this.quantities[productId] = Math.max(1, current + delta);
  }

  addToCart(product: ShopProduct) {
    const qty = this.quantities[product.product_id] ?? 1;
    this.cart.addProduct(product, qty);
  }

  isOutOfStock(product: ShopProduct): boolean {
    return parseFloat(product.remaining_quantity) <= 0;
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }
}
