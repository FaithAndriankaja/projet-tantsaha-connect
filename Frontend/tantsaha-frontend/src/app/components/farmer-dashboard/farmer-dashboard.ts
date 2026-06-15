import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { HarvestLine, Category } from '../../models/shop.models';

@Component({
  selector: 'app-farmer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './farmer-dashboard.html',
  styleUrl: './farmer-dashboard.css',
})
export class FarmerDashboard implements OnInit {
  currentUser: User | null = null;

  activeSection: 'harvest' | 'products' = 'harvest';

  harvestLines: HarvestLine[] = [];
  myProducts: any[] = [];
  categories: Category[] = [];

  loading = false;
  productsLoading = false;
  categoriesLoading = false;

  error = '';
  successMessage = '';

  isSidePanelOpen = false;
  isSavingProduct = false;

  farmName = 'Ma ferme';
  totalProducts = 0;
  totalOrdersCount = 0;
  totalQuantityToPrepare = 0;

  newProductName = '';
  newProductCategory = '';
  newProductQty = 1;
  newProductUnit = 'kg';
  newProductPrice = 0;
  newProductDescription = '';

  selectedImageFile: File | null = null;
  imagePreviewUrl = '';

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private router: Router
  ) { }

  ngOnInit() {
    this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
    });

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loading = false;
    this.productsLoading = false;

    this.loadCategories();
    this.loadHarvestSheet();
    this.loadMyProducts();
  }

  setSection(section: 'harvest' | 'products') {
    this.activeSection = section;
    this.error = '';
    this.successMessage = '';

    if (section === 'harvest') {
      this.loadHarvestSheet();
    }

    if (section === 'products') {
      this.loadMyProducts();
    }
  }

  loadHarvestSheet() {
    this.loading = true;
    this.error = '';

    this.api.getHarvestSheet().subscribe({
      next: (lines) => {
        this.harvestLines = lines ?? [];
        this.recalculateStats();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erreur chargement précommandes:', err);
        this.harvestLines = [];
        this.recalculateStats();
        this.loading = false;

        if (this.handleAuthError(err)) return;

        this.error =
          this.extractError(err) ||
          'Impossible de charger les précommandes à préparer.';
      },
    });
  }

  loadMyProducts() {
    this.productsLoading = true;
    this.error = '';

    this.api.getMyStocks().subscribe({
      next: (data) => {
        console.log('Mes produits reçus:', data);
        this.myProducts = data ?? [];
        this.recalculateStats();
        this.productsLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur chargement produits producteur:', err);
        console.error('Détails backend:', err?.error);

        this.myProducts = [];
        this.recalculateStats();
        this.productsLoading = false;

        if (err?.status === 401) {
          this.error = 'Session expirée. Veuillez vous reconnecter.';
          this.authService.logout();
          this.router.navigate(['/login']);
          return;
        }

        this.error = this.extractError(err) || 'Impossible de charger vos produits.';
      },
    });
  }

  loadCategories() {
    this.categoriesLoading = true;

    this.api.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats ?? [];

        if (!this.newProductCategory && this.categories.length > 0) {
          this.newProductCategory = this.categories[0].id;
        }

        this.categoriesLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur chargement catégories:', err);
        this.categories = [];
        this.categoriesLoading = false;

        if (this.handleAuthError(err)) return;
      },
    });
  }

  onAddProductSubmit() {
    this.error = '';
    this.successMessage = '';

    if (
      !this.newProductName.trim() ||
      !this.newProductCategory ||
      this.newProductQty <= 0 ||
      this.newProductPrice <= 0
    ) {
      this.error = 'Veuillez renseigner le nom, la catégorie, la quantité et le prix.';
      return;
    }

    this.isSavingProduct = true;

    const formData = new FormData();
    formData.append('name', this.newProductName.trim());
    formData.append('description', this.newProductDescription.trim());
    formData.append('category_id', this.newProductCategory);
    formData.append('unit', this.newProductUnit);
    formData.append('unit_price', String(this.newProductPrice));
    formData.append('quantity', String(this.newProductQty));

    if (this.selectedImageFile) {
      formData.append('image', this.selectedImageFile);
    }

    this.api.createStock(formData).subscribe({
      next: () => {
        this.successMessage = 'Récolte enregistrée avec succès.';
        this.isSavingProduct = false;
        this.isSidePanelOpen = false;
        this.resetForm();

        this.activeSection = 'products';
        this.loadHarvestSheet();
        this.loadMyProducts();
      },
      error: (err: any) => {
        console.error('Erreur création récolte:', err);
        this.isSavingProduct = false;

        if (this.handleAuthError(err)) return;

        this.error =
          this.extractError(err) ||
          "Erreur lors de l'enregistrement de la récolte.";
      },
    });
  }

  toggleSidePanel() {
    this.isSidePanelOpen = !this.isSidePanelOpen;
    this.error = '';
    this.successMessage = '';

    if (!this.isSidePanelOpen) {
      this.resetImageOnly();
    }
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      this.resetImageOnly();
      return;
    }

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.error = 'Veuillez sélectionner un fichier image valide.';
      this.resetImageOnly();
      return;
    }

    this.selectedImageFile = file;
    this.imagePreviewUrl = URL.createObjectURL(file);
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

  toggleProductVisibility(item: HarvestLine) {
    console.warn(
      'toggleProductVisibility désactivé : harvest_sheet_view ne contient pas stock_id/is_promoted.',
      item
    );
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get profileRoute(): string {
    return this.authService.getProfileRoute();
  }

  get ordersRoute(): string {
    return this.authService.getOrdersRoute();
  }

  formatQty(value: string | number | null | undefined): string {
    const n = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0);
    return Number.isFinite(n) ? new Intl.NumberFormat('fr-FR').format(n) : '0';
  }

  formatPrice(value: string | number | null | undefined): string {
    const n = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0);
    return Number.isFinite(n) ? new Intl.NumberFormat('fr-MG').format(n) : '0';
  }

  remainingQty(stock: any): number {
    const available = Number(stock?.available_quantity ?? 0);
    const reserved = Number(stock?.reserved_quantity ?? 0);
    return Math.max(available - reserved, 0);
  }

  private recalculateStats() {
    this.farmName =
      this.harvestLines[0]?.farm_name ||
      this.currentUser?.name ||
      'Ma ferme';

    this.totalProducts = this.myProducts.length || this.harvestLines.length;

    this.totalOrdersCount = this.harvestLines.reduce(
      (sum, line) => sum + Number(line.order_count || 0),
      0
    );

    this.totalQuantityToPrepare = this.harvestLines.reduce((sum, line) => {
      const qty = parseFloat(String(line.total_quantity_to_prepare ?? 0));
      return sum + (Number.isFinite(qty) ? qty : 0);
    }, 0);
  }

  private resetForm() {
    this.newProductName = '';
    this.newProductQty = 1;
    this.newProductUnit = 'kg';
    this.newProductPrice = 0;
    this.newProductDescription = '';
    this.newProductCategory = this.categories[0]?.id ?? '';
    this.resetImageOnly();
  }

  private resetImageOnly() {
    this.selectedImageFile = null;

    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }

    this.imagePreviewUrl = '';
  }

  private handleAuthError(err: any): boolean {
    if (err?.status !== 401) return false;

    this.error = 'Session expirée. Veuillez vous reconnecter.';
    this.loading = false;
    this.productsLoading = false;
    this.categoriesLoading = false;

    this.authService.logout();
    this.router.navigate(['/login']);

    return true;
  }

  private extractError(err: any): string {
    const data = err?.error;

    if (!data) return '';
    if (typeof data === 'string') return this.extractHtmlTitle(data);
    if (data.detail) return data.detail;
    if (data.message) return data.message;
    if (data.details) return JSON.stringify(data.details);

    try {
      return Object.entries(data)
        .map(([key, value]) => {
          if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
          if (typeof value === 'object') return `${key}: ${JSON.stringify(value)}`;
          return `${key}: ${value}`;
        })
        .join(' | ');
    } catch {
      return '';
    }
  }

  private extractHtmlTitle(html: string): string {
    const match = html.match(/<title>(.*?)<\/title>/i);
    return match?.[1]?.replace(/\s+/g, ' ').trim() || '';
  }
}