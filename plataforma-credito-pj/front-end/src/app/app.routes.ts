import { Routes } from '@angular/router';
import { authGuard } from './shared/auth-guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent) },

  { path: 'dashboard', canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard/dashboard').then(m => m.DashboardComponent) },
    
  { path: 'kpis', canActivate: [authGuard],
    loadComponent: () => import('./features/kpis/kpis/kpis').then(m => m.KpisComponent) },

  { path: 'empresa/:id', canActivate: [authGuard],
    loadComponent: () => import('./features/empresa/empresa-page/empresa-page').then(m => m.EmpresaPageComponent) },

  { path: 'empresa/cnpj/:cnpj', canActivate: [authGuard],
    loadComponent: () => import('./features/empresa/empresa-page/empresa-page').then(m => m.EmpresaPageComponent) },

  // redireciona para LOGIN por padrão
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
