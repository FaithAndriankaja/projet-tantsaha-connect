import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CartItem, CreatedOrder, ShopProduct } from '../models/shop.models';

const CART_KEY = 'tantsaha_cart';
const ORDER_KEY = 'tantsaha_last_order';

@Injectable({ providedIn: 'root' })
export class CartService {
  private itemsSubject = new BehaviorSubject<CartItem[]>(this.loadCart());
  items$ = this.itemsSubject.asObservable();

  get items(): CartItem[] {
    return this.itemsSubject.value;
  }

  get count(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get subtotal(): number {
    return this.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  }

  addProduct(product: ShopProduct, quantity = 1): void {
    const unitPrice = parseFloat(product.unit_price);

    const now = new Date();
    const closesAt = new Date(product.closes_at);

    if (product.sale_session_status !== 'open' || closesAt <= now) {
      alert('Cette session de vente est terminée.');
      return;
    }

    // Une commande Django est liée à un seul point de retrait et une seule session de vente.
    // Si l'utilisateur choisit un autre point/session, on démarre un nouveau panier
    // afin d'éviter un POST /api/orders/ en 400 Bad Request.
    const current = this.items[0];
    if (current && (current.pickup_point_id !== product.pickup_point_id || current.sale_session_id !== product.sale_session_id)) {
      this.itemsSubject.next([]);
      localStorage.removeItem(CART_KEY);
    }

    const items = this.items;
    const existing = items.find((i) => i.product_id === product.product_id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({
        product_id: product.product_id,
        product_name: product.product_name,
        producer_id: product.producer_id,
        farm_name: product.farm_name,
        unit_price: Number(product.unit_price),
        unit: product.unit,
        quantity: 1,
        pickup_point_id: product.pickup_point_id,
        pickup_point_name: product.pickup_point_name,
        sale_session_id: product.sale_session_id,
        closes_at: product.closes_at,
        sale_session_status: product.sale_session_status,
        product_image_path: product.product_image_path,
      });
    }

    this.persist();
  }

  updateQuantity(productId: string, quantity: number): void {
    const item = this.items.find((i) => i.product_id === productId);
    if (!item) return;
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    item.quantity = quantity;
    this.persist();
  }

  removeItem(productId: string): void {
    const next = this.items.filter((i) => i.product_id !== productId);
    this.itemsSubject.next(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
  }

  clear(): void {
    this.itemsSubject.next([]);
    localStorage.removeItem(CART_KEY);
  }

  saveLastOrder(order: CreatedOrder): void {
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
  }

  getLastOrder(): CreatedOrder | null {
    const raw = sessionStorage.getItem(ORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  clearLastOrder(): void {
    sessionStorage.removeItem(ORDER_KEY);
  }

  buildOrderPayload() {
    if (this.items.length === 0) return null;

    const first = this.items[0];

    return {
      pickup_point_id: first.pickup_point_id,
      sale_session_id: first.sale_session_id,
      items: this.items.map((item) => ({
        product: item.product_id,
        producer: item.producer_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    };
  }

  private loadCart(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    this.itemsSubject.next([...this.items]);
    localStorage.setItem(CART_KEY, JSON.stringify(this.items));
  }
}
