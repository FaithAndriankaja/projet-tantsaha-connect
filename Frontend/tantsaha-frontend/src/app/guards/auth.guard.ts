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
