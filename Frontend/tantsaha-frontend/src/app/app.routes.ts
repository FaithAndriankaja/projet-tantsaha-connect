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

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'boutique-desktop', component: MarketplaceProduce },
  { path: 'boutique-mobile', component: MarketplaceMobile },
  { path: 'panier-recap', component: Checkout },
  { path: 'panier-paiement', component: CheckoutPayment },
  { path: 'commande-succes', component: SuccessOrder },
  { path: 'tantsaha-recolte', component: FarmerDashboard },
  { path: 'tantsaha-ferme', component: FarmerProfile },
  { path: 'profil-acheteur', component: ProfilAcheteur },
  { path: 'mpandrindra-livraison', component: Emargement },
  { path: '**', redirectTo: '' },
];

