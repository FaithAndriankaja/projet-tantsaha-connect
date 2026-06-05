import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-success-order',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './success-order.html',
  styleUrl: './success-order.css',
})
export class SuccessOrder implements OnInit {
  currentUser: User | null = null;
  orderId: string = 'TC-' + Math.floor(100000 + Math.random() * 900000);
  qrCodeUrl: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });

    // Mock QR Data: OrderID, ClientName, PickupPoint
    const qrData = JSON.stringify({
      orderId: this.orderId,
      client: this.currentUser?.name || 'Client',
      pickup: 'Analakely - Gare'
    });
    
    this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;
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
    } catch (error) {
      console.error('Erreur lors du téléchargement du pass:', error);
      alert('Impossible de télécharger le pass pour le moment. Veuillez réessayer.');
    }
  }
}
