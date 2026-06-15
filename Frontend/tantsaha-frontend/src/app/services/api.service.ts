import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { CreatedOrder, HarvestLine, ManagerDelivery, OrderSummary, PickupPoint, ProducerProfile, ShopProduct, Category } from '../models/shop.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = (window as any).__APP_CONFIG?.API_BASE_URL || '/api';

  constructor(private http: HttpClient) { }

  getShop(params?: Record<string, string>): Observable<ShopProduct[]> {
    console.log('ApiService: loading shop with params:', params);
    //  CORRECTION : Alignement avec la route simplifiée de Django 'api/shop/'
    return this.http.get<ShopProduct[] | { results: ShopProduct[] }>(`${this.base}/shop/`, { params }).pipe(
      map((res) => {
        console.log('ApiService: shop loaded successfully:', res);
        return Array.isArray(res) ? res : res.results ?? [];
      }),
      tap({
        error: (err: any) => console.error('ApiService: error loading shop:', err)
      })
    );
  }

  //  AJOUT : Récupérer la session de marché éphémère active pour l'accueil et les blocages de sécurité
  getActiveMarketSession(): Observable<any> {
    return this.http.get<any>(`${this.base}/shop/active-session/`);
  }

  //  AJOUT : Envoyer l'état de l'interrupteur "Mettre en avant" du Tantsaha à Django
  toggleProductVisibility(stockId: string): Observable<{ status: string; is_promoted: boolean }> {
    return this.http.post<{ status: string; is_promoted: boolean }>(
      `${this.base}/stocks/${stockId}/toggle-visibility/`,
      {}
    );
  }

  createOrder(payload: unknown): Observable<CreatedOrder> {
    return this.http.post<CreatedOrder>(`${this.base}/orders/`, payload);
  }

  uploadPayment(orderId: string, payload: { method: string; proof_file_path: string }) {
    return this.http.post(`${this.base}/orders/${orderId}/payment/`, payload);
  }

  loginPhone(phone: string, password: string) {
    return this.http.post(`${this.base}/auth/login/`, { phone, password });
  }

  register(payload: {
    phone: string;
    password: string;
    full_name: string;
    email?: string;
    role: string;
    farm_name?: string;
    location?: string;
  }) {
    return this.http.post(`${this.base}/auth/register/`, payload);
  }

  refreshToken(refresh: string) {
    return this.http.post<{ access: string }>(`${this.base}/auth/token/refresh/`, { refresh });
  }

  uploadProof(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ proof_file_path: string }>(`${this.base}/media/proof/`, formData);
  }

  getOrders(): Observable<OrderSummary[]> {
    return this.http.get<OrderSummary[] | { results: OrderSummary[] }>(`${this.base}/orders/`).pipe(
      map((res) => (Array.isArray(res) ? res : res.results ?? []))
    );
  }

  getHarvestSheet(): Observable<HarvestLine[]> {
    return this.http.get<HarvestLine[] | { results: HarvestLine[] }>(`${this.base}/harvest-sheet/`).pipe(
      map((res) => (Array.isArray(res) ? res : res.results ?? []))
    );
  }

  getProducerProfile(): Observable<ProducerProfile> {
    return this.http.get<ProducerProfile>(`${this.base}/producers/me/`);
  }

  getPickupPoints(): Observable<PickupPoint[]> {
    return this.http.get<PickupPoint[] | { results: PickupPoint[] }>(`${this.base}/pickup-points/`).pipe(
      map((res) => (Array.isArray(res) ? res : res.results ?? []))
    );
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[] | { results: Category[] }>(`${this.base}/categories/`).pipe(
      map((res) => (Array.isArray(res) ? res : res.results ?? []))
    );
  }

  getManagerDeliveries(): Observable<ManagerDelivery[]> {
    return this.http.get<ManagerDelivery[] | { results: ManagerDelivery[] }>(`${this.base}/manager/deliveries/`).pipe(
      map((res) => (Array.isArray(res) ? res : res.results ?? []))
    );
  }

  confirmHandover(orderId: string): Observable<{ status: string; transaction_code: string }> {
    return this.http.post<{ status: string; transaction_code: string }>(
      `${this.base}/orders/${orderId}/handover/`,
      {}
    );
  }

  createStock(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/producer/harvests/`, payload);
  }


  getSaleSessions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/sale-sessions/`);
  }

  createSaleSession(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/sale-sessions/`, payload);
  }

  updateSaleSession(id: string, payload: any): Observable<any> {
    return this.http.patch<any>(`${this.base}/sale-sessions/${id}/`, payload);
  }
}
