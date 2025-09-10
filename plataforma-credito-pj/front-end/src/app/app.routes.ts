import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.LoginComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard/dashboard').then(m => m.DashboardComponent),
  },
  {
    path: 'kpis',
    loadComponent: () =>
      import('./features/kpis/kpis/kpis').then(m => m.KpisComponent),
  },

  // empresa: id ou cnpj
  {
    path: 'empresa/:id',
    loadComponent: () =>
      import('./features/empresa/empresa-page/empresa-page').then(m => m.EmpresaPageComponent),
  },
  {
    path: 'empresa/cnpj/:cnpj',
    loadComponent: () =>
      import('./features/empresa/empresa-page/empresa-page').then(m => m.EmpresaPageComponent),
  },

  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
