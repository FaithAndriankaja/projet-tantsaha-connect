import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

export const producerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn() && auth.isProducer()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

export const managerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn() && auth.isManager()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

export const consumerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn() && auth.isConsumer()) {
    return true;
  }
  if (auth.isLoggedIn()) {
    return router.createUrlTree([auth.getProfileRoute()]);
  }
  return router.createUrlTree(['/login']);
};

// --- NOUVEAU GUARD AJOUTÉ POUR LE CLOISONNEMENT DE L'ACCUEIL ---
export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Si l'utilisateur n'est pas connecté, il a le droit de voir la page d'accueil (visiteur)
  if (!auth.isLoggedIn()) {
    return true;
  }

  // Si c'est un producteur, on le redirige automatiquement vers son espace
  if (auth.isProducer()) {
    return router.createUrlTree(['/tantsaha-recolte']);
  }

  // Si c'est un manager, on le redirige automatiquement vers son espace
  if (auth.isManager()) {
    return router.createUrlTree(['/mpandrindra-livraison']);
  }

  // Si c'est un acheteur connecté, il peut rester sur la page d'accueil publique
  return true;
};
