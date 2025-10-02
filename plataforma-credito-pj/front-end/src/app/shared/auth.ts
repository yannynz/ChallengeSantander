import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly KEY = 'pj_token';
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private get isBrowser() { return isPlatformBrowser(this.platformId); }

  /** Token só quando estiver no browser */
  get token(): string | null {
    if (!this.isBrowser) return null;
    try { return localStorage.getItem(this.KEY); } catch { return null; }
  }

  isLoggedIn(): boolean { return !!this.token; }
  isAuth(): boolean { return this.isLoggedIn(); }

  login(email: string, password: string): boolean {
    if (email?.trim() && password?.trim()) {
      if (this.isBrowser) {
        try { localStorage.setItem(this.KEY, 'mock-token'); } catch {}
      }
      return true;
    }
    return false;
  }

  logout(): void {
    if (this.isBrowser) {
      try { localStorage.removeItem(this.KEY); } catch {}
    }
    this.router.navigateByUrl('/login');
  }
}
