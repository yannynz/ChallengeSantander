import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

import { ApiService, MetricsResponse } from '../../../shared/api';

@Component({
  standalone: true,
  selector: 'app-metrics',
  imports: [CommonModule, MatCardModule, RouterLink, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './metrics.html',
  styleUrls: ['./metrics.scss'],
})
export class MetricsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly metrics = signal<MetricsResponse | null>(null);

  readonly classificacao = computed(() => this.metrics()?.classificacao ?? {});
  readonly clusterizacao = computed(() => this.metrics()?.clusterizacao ?? {});
  readonly atualizadoEm = computed(() => this.formatDate(this.metrics()?.atualizado_em));
  readonly fonte = computed(() => this.metrics()?.fonte ?? null);
  readonly janelaDias = computed(() => this.metrics()?.janela_dias ?? null);
  readonly driftPsi = computed(() => this.metrics()?.drift_psi ?? null);
  readonly classificacaoLista = computed(() =>
    Object.entries(this.classificacao()).map(([key, value]) => ({ key, value }))
  );
  readonly clusterizacaoLista = computed(() =>
    Object.entries(this.clusterizacao()).map(([key, value]) => ({ key, value }))
  );

  readonly historicoChart = signal<ChartConfiguration<'line'>['data']>({ labels: [], datasets: [] });
  readonly historicoOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label ?? 'AUC'}: ${Number(ctx.formattedValue).toFixed(3)}`,
        },
      },
    },
    scales: {
      y: { beginAtZero: false, min: 0.6, max: 1 },
    },
  };

  ngOnInit(): void {
    this.carregar(false);
  }

  recarregar(): void {
    this.loading.set(true);
    this.carregar(true);
  }

  private carregar(refresh: boolean): void {
    this.api
      .getMetrics(refresh)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          console.error('Falha ao carregar metricas', error);
          this.error.set('Nao foi possivel carregar as metricas.');
          this.loading.set(false);
          return of(null);
        })
      )
      .subscribe((payload) => {
        if (!payload) {
          return;
        }
        this.metrics.set(payload);
        this.historicoChart.set(this.buildHistoricoChart(payload));
        this.loading.set(false);
      });
  }

  private buildHistoricoChart(payload: MetricsResponse): ChartConfiguration<'line'>['data'] {
    const historico = payload.historico_auc ?? [];
    return {
      labels: historico.map((item) => item.periodo),
      datasets: [
        {
          label: 'AUC por periodo',
          data: historico.map((item) => Number(item.auc.toFixed(3))),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.2)',
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }

  private formatDate(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
