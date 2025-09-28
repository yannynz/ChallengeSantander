import { Component, DestroyRef, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiService, Decisao } from '../../../shared/api';

@Component({
  standalone: true,
  selector: 'app-kpis',
  templateUrl: './kpis.html',
  styleUrls: ['./kpis.scss'],
  imports: [CommonModule, MatCardModule],
})
export class KpisComponent implements OnInit {
  constructor(
    private readonly api: ApiService,
    private readonly destroyRef: DestroyRef,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  goBack(): void {
    const term = (this.route.snapshot.queryParamMap.get('term') ?? '').trim();
    if (term) {
      this.router.navigate(['/dashboard'], { queryParams: { term } });
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  loading = signal(false);
  error = signal<string | null>(null);
  decisoes = signal<Decisao[]>([]);

  totalAnalises = computed(() => this.decisoes().length);
  scoreMedio = computed(() => {
    const lista = this.decisoes();
    if (!lista.length) {
      return '--';
    }
    const soma = lista.reduce((acc, dec) => acc + this.toPercent(dec.score), 0);
    return (soma / lista.length).toFixed(1);
  });
  aprovacao = computed(() => {
    const lista = this.decisoes();
    if (!lista.length) {
      return '--';
    }
    const aprovados = lista.filter((dec) => dec.aprovacao).length;
    return ((aprovados / lista.length) * 100).toFixed(1);
  });
  limiteMedio = computed(() => {
    const lista = this.decisoes();
    if (!lista.length) {
      return '--';
    }
    const soma = lista.reduce((acc, dec) => acc + (dec.limite ?? 0), 0);
    return this.formatCurrency(soma / lista.length);
  });

  ngOnInit(): void {
    this.loadDecisoes();
  }

  private loadDecisoes(): void {
    this.loading.set(true);
    this.api
      .listDecisoes()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (lista) => {
          this.error.set(null);
          this.decisoes.set(lista);
        },
        error: (err) => {
          console.error('Erro ao carregar KPIs', err);
          this.error.set('Nao foi possivel carregar os indicadores.');
          this.decisoes.set([]);
        },
      });
  }

  private toPercent(value: number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return numeric > 1 ? numeric : numeric * 100;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
