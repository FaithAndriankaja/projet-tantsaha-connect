import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { ShopProduct, PickupPoint, Category } from '../../models/shop.models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-marketplace-produce',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './marketplace-produce.html',
  styleUrl: './marketplace-produce.css',
})
export class MarketplaceProduce implements OnInit {
  currentUser: User | null = null;
  products: ShopProduct[] = [];
  categories: Category[] = [];
  pickupPoints: PickupPoint[] = [];

  // Filter state
  searchTerm = '';
  selectedCategory = '';
  selectedPickupPoint = '';
  maxPrice = 500000;

  loading = true;
  error = '';
  addedProductId: string | null = null;
  cartCount = 0;

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private cart: CartService,
    private cdr: ChangeDetectorRef,
    private router: Router //  AJOUT : Pour la redirection de sécurité vers le login
  ) { }

  // Dans marketplace-produce.ts, nettoyez votre ngOnInit() comme ceci :
  ngOnInit() {
    this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
    });
    this.cart.items$.subscribe((items) => {
      this.cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
    });

    this.api.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
        // SUPPRIMER OU COMMENTER : this.cdr.detectChanges();
      }
    });

    this.api.getPickupPoints().subscribe({
      next: (pts) => {
        this.pickupPoints = pts;
        //  SUPPRIMER OU COMMENTER : this.cdr.detectChanges();
      }
    });
    this.loadProducts();
  }


  //  AJOUT : Getter indispensable requis par votre template HTML
  get filteredProducts(): ShopProduct[] {
    return this.products;
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
    this.router.navigate(['/login']);
  }

  selectCategory(name: string) {
    this.selectedCategory = this.selectedCategory === name ? '' : name;
    this.loadProducts(); //  AMÉLIORATION : Recharge automatiquement au clic de la catégorie
  }

  loadProducts() {
    this.loading = true;
    this.error = '';
    const params: Record<string, string> = {};
    if (this.searchTerm.trim()) params['search'] = this.searchTerm.trim();
    if (this.selectedCategory) params['category_name'] = this.selectedCategory;
    if (this.selectedPickupPoint) params['pickup_point_id'] = this.selectedPickupPoint;
    if (this.maxPrice < 500000) params['max_price'] = String(this.maxPrice);

    // Appelle désormais l'URL simplifiée 'api/shop/' configurée dans Django urls.py
    this.api.getShop(params).subscribe({
      next: (products) => {
        this.products = products;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Marketplace: received error in subscribe():', err);
        this.error = 'Impossible de charger le catalogue. Vérifiez que le backend est démarré.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedPickupPoint = '';
    this.maxPrice = 500000;
    this.loadProducts();
  }

  formatPrice(value: string | number): string {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('fr-MG').format(n);
  }

  addToCart(product: ShopProduct) {
    if (!this.currentUser || this.currentUser.role !== 'consumer') {
      this.router.navigate(['/login']);
      return;
    }

    if (this.isOutOfStock(product)) {
      alert('Ce produit est en rupture de stock.');
      return;
    }

    if (this.isSessionClosed(product)) {
      alert('Cette session de vente est terminée. Veuillez choisir un autre produit.');
      this.loadProducts();
      return;
    }

    this.cart.addProduct(product);
    this.addedProductId = product.product_id;

    setTimeout(() => {
      if (this.addedProductId === product.product_id) {
        this.addedProductId = null;
      }
    }, 2000);
  }

  getProductImageUrl(path: string | null | undefined): string {
    if (!path) return '';

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    if (path.startsWith('/media/')) {
      return `${window.location.origin}${path}`;
    }

    if (path.startsWith('media/')) {
      return `${window.location.origin}/${path}`;
    }

    return `${window.location.origin}/media/${path}`;
  }

  isOutOfStock(product: ShopProduct): boolean {
    return parseFloat(product.remaining_quantity) <= 0;
  }

  isSessionClosed(product: ShopProduct): boolean {
    const now = new Date();
    const closesAt = new Date(product.closes_at);

    return product.sale_session_status !== 'open' || closesAt <= now;
  }
}
