import { Component, OnInit, ChangeDetectorRef, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
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
export class FarmerDashboard implements OnInit, AfterViewInit {
  currentUser: User | null = null;

  // Navigation
  activeSection: 'overview' | 'products' | 'orders' | 'stats' = 'overview';

  // Data
  harvestLines: HarvestLine[] = [];
  myProducts: any[] = [];
  myOrders: any[] = [];
  categories: Category[] = [];
  availableSessions: any[] = [];

  // Loading states
  loading = false;
  productsLoading = false;
  ordersLoading = false;
  categoriesLoading = false;
  sessionsLoading = false;

  // UI state
  error = '';
  successMessage = '';
  isSidePanelOpen = false;
  isSavingProduct = false;
  editingStockId: string | null = null;

  // Form fields
  newProductName = '';
  newProductCategory = '';
  newProductSaleSession = '';
  newProductQty = 1;
  newProductUnit = 'kg';
  newProductPrice = 0;
  newProductDescription = '';
  selectedImageFile: File | null = null;
  imagePreviewUrl = '';

  // KPIs
  farmName = 'Ma ferme';
  totalRevenue = 0;
  totalProductsSold = 0;
  totalStockRemaining = 0;
  totalOrdersCount = 0;
  totalQuantityToPrepare = 0;

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.authService.syncSession();
    this.authService.currentUser.subscribe((user) => {
      this.currentUser = user;
    });

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadCategories();
    this.loadSaleSessions();
    this.loadHarvestSheet();
    this.loadMyProducts();
    this.loadMyOrders();
  }

  ngAfterViewInit() {}

  setSection(section: 'overview' | 'products' | 'orders' | 'stats') {
    this.activeSection = section;
    this.error = '';
    this.successMessage = '';
    if (section === 'products') this.loadMyProducts();
    if (section === 'orders') this.loadMyOrders();
    if (section === 'overview') {
      this.loadHarvestSheet();
      this.loadMyProducts();
    }
  }

  // ── Data loading ──────────────────────────────────────────

  loadHarvestSheet(showLoading = true) {
    if (showLoading) this.loading = true;
    this.api.getHarvestSheet().subscribe({
      next: (lines) => {
        this.harvestLines = lines ?? [];
        this.recalculateKPIs();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Erreur chargement feuille de récolte:', err);
        this.harvestLines = [];
        this.loading = false;
        if (this.handleAuthError(err)) return;
        this.cdr.detectChanges();
      },
    });
  }

  loadMyProducts(showLoading = true) {
    if (showLoading) this.productsLoading = true;
    this.api.getMyStocks().subscribe({
      next: (data) => {
        this.myProducts = data ?? [];
        this.recalculateKPIs();
        this.productsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Erreur chargement produits:', err);
        this.myProducts = [];
        this.productsLoading = false;
        if (this.handleAuthError(err)) return;
        this.error = this.extractError(err) || 'Impossible de charger vos produits.';
        this.cdr.detectChanges();
      },
    });
  }

  loadMyOrders(showLoading = true) {
    if (showLoading) this.ordersLoading = true;
    this.api.getOrders().subscribe({
      next: (orders) => {
        this.myOrders = (orders ?? []);
        this.recalculateKPIs();
        this.ordersLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Erreur chargement commandes:', err);
        this.myOrders = [];
        this.ordersLoading = false;
        this.cdr.detectChanges();
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

  loadSaleSessions() {
    this.sessionsLoading = true;
    this.api.getSaleSessions().subscribe({
      next: (sessions) => {
        this.availableSessions = sessions ?? [];
        if (!this.newProductSaleSession && this.availableSessions.length > 0) {
          this.newProductSaleSession = this.availableSessions[0].id;
        }
        this.sessionsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Erreur chargement sessions:', err);
        this.availableSessions = [];
        this.sessionsLoading = false;
        if (this.handleAuthError(err)) return;
      },
    });
  }

  // ── KPI calculation ────────────────────────────────────────

  private recalculateKPIs() {
    this.farmName =
      this.harvestLines[0]?.farm_name || this.currentUser?.name || 'Ma ferme';

    // Total stock remaining
    this.totalStockRemaining = this.myProducts.reduce((sum, s) => {
      return sum + Math.max(
        Number(s.available_quantity ?? 0) - Number(s.reserved_quantity ?? 0), 0
      );
    }, 0);

    // Count orders
    this.totalOrdersCount = this.myOrders.length;

    // Products sold = reserved across all stocks
    this.totalProductsSold = this.myProducts.reduce(
      (sum, s) => sum + Number(s.reserved_quantity ?? 0), 0
    );

    // Revenue = sum of (unit_price × reserved_quantity) for confirmed/delivered orders
    this.totalRevenue = this.myProducts.reduce((sum, s) => {
      const price = parseFloat(String(s.unit_price ?? 0));
      const sold = Number(s.reserved_quantity ?? 0);
      return sum + (price * sold);
    }, 0);

    // Quantity to prepare (from harvest sheet)
    this.totalQuantityToPrepare = this.harvestLines.reduce((sum, line) => {
      const qty = parseFloat(String(line.total_quantity_to_prepare ?? 0));
      return sum + (Number.isFinite(qty) ? qty : 0);
    }, 0);
  }

  // ── Order status helpers ────────────────────────────────────

  get preOrders(): any[] {
    return this.myOrders.filter(o => ['pending_payment', 'payment_submitted'].includes(o.status));
  }
  get paidOrders(): any[] {
    return this.myOrders.filter(o => ['confirmed', 'ready', 'delivering'].includes(o.status));
  }
  get closedOrders(): any[] {
    return this.myOrders.filter(o => ['picked_up', 'closed'].includes(o.status));
  }

  orderStatusLabel(status: string): string {
    const s = (status || '').toLowerCase();
    if (['pending_payment', 'payment_submitted'].includes(s)) return 'Précommande';
    if (['confirmed', 'ready', 'delivering'].includes(s)) return 'Payé — À préparer';
    if (['picked_up', 'closed'].includes(s)) return 'Remis';
    return status || 'Inconnu';
  }

  orderStatusColor(status: string): string {
    const s = (status || '').toLowerCase();
    if (['pending_payment', 'payment_submitted'].includes(s))
      return 'bg-amber-50 text-amber-700 border-amber-200';
    if (['confirmed', 'ready', 'delivering'].includes(s))
      return 'bg-green-50 text-green-700 border-green-200';
    if (['picked_up', 'closed'].includes(s))
      return 'bg-surface-container-low text-on-surface-variant border-outline-variant/30';
    return 'bg-surface-container-low text-on-surface-variant border-outline-variant/30';
  }

  // ── Product status helpers ──────────────────────────────────

  productStatusLabel(stock: any): string {
    const status = (stock?.approval_status || '').toLowerCase();
    if (status === 'pending') return 'En attente de validation';
    if (status === 'published' && stock?.is_promoted) return 'Validé / En ligne';
    if (status === 'published') return 'Approuvé';
    if (status === 'rejected') return 'Rejeté';
    return stock?.approval_status || 'Inconnu';
  }

  productStatusClass(stock: any): string {
    const status = (stock?.approval_status || '').toLowerCase();
    if (status === 'pending')
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (status === 'published' && stock?.is_promoted)
      return 'bg-green-50 text-green-700 border border-green-200';
    if (status === 'published')
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    if (status === 'rejected')
      return 'bg-red-50 text-red-700 border border-red-200';
    return 'bg-surface-container-low text-on-surface-variant';
  }

  productStatusIcon(stock: any): string {
    const status = (stock?.approval_status || '').toLowerCase();
    if (status === 'pending') return 'hourglass_empty';
    if (status === 'published' && stock?.is_promoted) return 'storefront';
    if (status === 'published') return 'check_circle';
    if (status === 'rejected') return 'cancel';
    return 'help';
  }

  // ── Stats/chart helpers ─────────────────────────────────────

  /** Sales by product for bar chart display */
  get salesByProduct(): { name: string; qty: number; revenue: number; pct: number }[] {
    const maxQty = Math.max(
      ...this.myProducts.map(s => Number(s.reserved_quantity ?? 0)), 1
    );
    return this.myProducts.map(s => ({
      name: s.product_name || 'Produit',
      qty: Number(s.reserved_quantity ?? 0),
      revenue: parseFloat(String(s.unit_price ?? 0)) * Number(s.reserved_quantity ?? 0),
      pct: Math.round((Number(s.reserved_quantity ?? 0) / maxQty) * 100),
    })).sort((a, b) => b.qty - a.qty).slice(0, 6);
  }

  /** Stock gauge per product */
  get stockGauges(): { name: string; available: number; reserved: number; pct: number; low: boolean }[] {
    return this.myProducts.map(s => {
      const avail = Number(s.available_quantity ?? 0);
      const reserved = Number(s.reserved_quantity ?? 0);
      const remaining = Math.max(avail - reserved, 0);
      const pct = avail > 0 ? Math.round((remaining / avail) * 100) : 0;
      return {
        name: s.product_name || 'Produit',
        available: avail,
        reserved,
        pct,
        low: pct < 25,
      };
    });
  }

  // ── Product form actions ────────────────────────────────────

  onAddProductSubmit() {
    this.error = '';
    this.successMessage = '';

    if (
      !this.newProductName.trim() ||
      !this.newProductCategory ||
      !this.newProductSaleSession ||
      this.newProductQty <= 0 ||
      this.newProductPrice <= 0
    ) {
      this.error = 'Veuillez renseigner tous les champs obligatoires (nom, catégorie, session, quantité, prix).';
      return;
    }

    this.isSavingProduct = true;

    if (this.editingStockId) {
      this.api.updateStock(this.editingStockId, { available_quantity: this.newProductQty }).subscribe({
        next: () => {
          this.successMessage = 'Stock mis à jour avec succès.';
          this.isSavingProduct = false;
          this.isSidePanelOpen = false;
          this.resetForm();
          this.loadMyProducts(false);
        },
        error: (err: any) => {
          this.isSavingProduct = false;
          if (this.handleAuthError(err)) return;
          this.error = this.extractError(err) || 'Erreur lors de la mise à jour.';
        },
      });
      return;
    }

    const formData = new FormData();
    formData.append('name', this.newProductName.trim());
    formData.append('description', this.newProductDescription.trim());
    formData.append('category_id', this.newProductCategory);
    formData.append('sale_session_id', this.newProductSaleSession);
    formData.append('unit', this.newProductUnit);
    formData.append('unit_price', String(this.newProductPrice));
    formData.append('quantity', String(this.newProductQty));
    if (this.selectedImageFile) formData.append('image', this.selectedImageFile);

    this.api.createStock(formData).subscribe({
      next: (newStock) => {
        this.successMessage = 'Récolte soumise avec succès — en attente de validation du gestionnaire.';
        this.isSavingProduct = false;
        this.isSidePanelOpen = false;
        this.resetForm();
        this.activeSection = 'products';
        this.loadMyProducts(false);
      },
      error: (err: any) => {
        console.error('Erreur création récolte:', err);
        this.isSavingProduct = false;
        if (this.handleAuthError(err)) return;
        this.error = this.extractError(err) || "Erreur lors de l'enregistrement de la récolte.";
      },
    });
  }

  toggleSidePanel() {
    this.isSidePanelOpen = !this.isSidePanelOpen;
    this.error = '';
    this.successMessage = '';
    if (!this.isSidePanelOpen) this.resetImageOnly();
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

  // ── Misc helpers ─────────────────────────────────────────────

  getProductImageUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/media/')) return `${window.location.origin}${path}`;
    if (path.startsWith('media/')) return `${window.location.origin}/${path}`;
    return `${window.location.origin}/media/${path}`;
  }

  logout() { this.authService.logout(); }

  get profileRoute(): string { return this.authService.getProfileRoute(); }
  get ordersRoute(): string { return this.authService.getOrdersRoute(); }

  remainingQty(stock: any): number {
    return Math.max(Number(stock?.available_quantity ?? 0) - Number(stock?.reserved_quantity ?? 0), 0);
  }

  stockPercentage(stock: any): number {
    const avail = Number(stock?.available_quantity ?? 0);
    if (avail === 0) return 0;
    return Math.round((this.remainingQty(stock) / avail) * 100);
  }

  formatQty(value: string | number | null | undefined): string {
    const n = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0);
    return Number.isFinite(n) ? new Intl.NumberFormat('fr-FR').format(n) : '0';
  }

  formatPrice(value: string | number | null | undefined): string {
    const n = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0);
    return Number.isFinite(n) ? new Intl.NumberFormat('fr-MG').format(n) : '0';
  }

  private resetForm() {
    this.editingStockId = null;
    this.newProductName = '';
    this.newProductDescription = '';
    this.newProductCategory = this.categories.length > 0 ? this.categories[0].id : '';
    this.newProductSaleSession = this.availableSessions.length > 0 ? this.availableSessions[0].id : '';
    this.newProductUnit = 'kg';
    this.newProductPrice = 0;
    this.newProductQty = 0;
    this.resetImageOnly();
  }

  private resetImageOnly() {
    this.selectedImageFile = null;
    if (this.imagePreviewUrl) URL.revokeObjectURL(this.imagePreviewUrl);
    this.imagePreviewUrl = '';
  }

  private handleAuthError(err: any): boolean {
    if (err?.status !== 401) return false;
    this.error = 'Session expirée. Veuillez vous reconnecter.';
    this.loading = false;
    this.productsLoading = false;
    this.authService.logout(true);
    this.router.navigate(['/login']);
    return true;
  }

  private extractError(err: any): string {
    const data = err?.error;
    if (!data) return '';
    if (typeof data === 'string') return this.extractHtmlTitle(data);
    if (data.detail) return data.detail;
    if (data.message) return data.message;
    try {
      return Object.entries(data)
        .map(([key, value]) => {
          if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
          if (typeof value === 'object') return `${key}: ${JSON.stringify(value)}`;
          return `${key}: ${value}`;
        })
        .join(' | ');
    } catch { return ''; }
  }

  private extractHtmlTitle(html: string): string {
    const match = html.match(/<title>(.*?)<\/title>/i);
    return match?.[1]?.replace(/\s+/g, ' ').trim() || '';
  }
}