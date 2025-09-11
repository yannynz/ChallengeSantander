// src/app/shared/auth-guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const ok = auth.isLoggedIn();
  console.log('[guard] isLoggedIn =', ok);
  return ok ? true : router.createUrlTree(['/login']);
};
