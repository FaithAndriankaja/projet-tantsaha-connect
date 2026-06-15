import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { MarketplaceProduce } from './components/marketplace-produce/marketplace-produce';
import { MarketplaceMobile } from './components/marketplace-mobile/marketplace-mobile';
import { Checkout } from './components/checkout/checkout';
import { CheckoutPayment } from './components/checkout-payment/checkout-payment';
import { FarmerDashboard } from './components/farmer-dashboard/farmer-dashboard';
import { FarmerProfile } from './components/farmer-profile/farmer-profile';
import { Emargement } from './components/emargement/emargement';
import { ProfilAcheteur } from './components/profil-acheteur/profil-acheteur';
import { SuccessOrder } from './components/success-order/success-order';
import { MesCommandes } from './components/mes-commandes/mes-commandes';

// Importation de vos Guards existants + ajout d'un Guard de redirection pour la page d'accueil
import { authGuard, producerGuard, managerGuard, consumerGuard, homeRedirectGuard } from './guards/auth.guard';

export const routes: Routes = [
  // L'accueil utilise désormais un 'homeRedirectGuard' : si un pro est connecté, il est éjecté vers son dashboard
  { path: '', component: Home, canActivate: [homeRedirectGuard] },

  { path: 'login', component: Login },
  { path: 'register', component: Register },

  // Sécurisation des Marchés Éphémères : Seuls les acheteurs (connectés ou visiteurs selon votre logique) peuvent y entrer.
  // Si le producteur essaie d'aller ici, le consumerGuard va bloquer l'accès.
  { path: 'boutique-desktop', component: MarketplaceProduce, canActivate: [consumerGuard] },
  { path: 'boutique-mobile', component: MarketplaceMobile, canActivate: [consumerGuard] },

  { path: 'panier-recap', component: Checkout, canActivate: [authGuard, consumerGuard] },
  { path: 'panier-paiement', component: CheckoutPayment, canActivate: [authGuard, consumerGuard] },
  { path: 'commande-succes', component: SuccessOrder, canActivate: [authGuard, consumerGuard] },

  // Espaces professionnels strictement réservés
  { path: 'tantsaha-recolte', component: FarmerDashboard, canActivate: [authGuard, producerGuard] },
  { path: 'tantsaha-ferme', component: FarmerProfile, canActivate: [authGuard, producerGuard] },
  { path: 'mpandrindra-livraison', component: Emargement, canActivate: [authGuard, managerGuard] },

  // Espace Client personnel
  { path: 'profil-acheteur', component: ProfilAcheteur, canActivate: [authGuard, consumerGuard] },
  { path: 'mes-commandes', component: MesCommandes, canActivate: [authGuard, consumerGuard] },

  { path: '**', redirectTo: '' },
];
