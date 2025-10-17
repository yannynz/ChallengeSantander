import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

import { ApiService, ImpactoCliente, ImpactoResponse, ImpactoMetadata, RedeInfluencia } from '../../../shared/api';

type BarData = ChartConfiguration<'bar'>['data'];

@Component({
  standalone: true,
  selector: 'app-impacto',
  imports: [CommonModule, MatCardModule, RouterLink, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './impacto.html',
  styleUrls: ['./impacto.scss'],
})
export class ImpactoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly clientes = signal<ImpactoCliente[]>([]);
  readonly rede = signal<RedeInfluencia[]>([]);
  readonly resumo = signal<string | null>(null);
  readonly metadados = signal<ImpactoMetadata | null>(null);

  readonly limitesChart = signal<BarData>({ labels: [], datasets: [] });
  readonly redeChart = signal<BarData>({ labels: [], datasets: [] });

  readonly limitesOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (value) => `R$ ${value}` } },
      x: { ticks: { autoSkip: false } },
    },
  };

  readonly redeOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label ?? 'Influencia'}: ${ctx.formattedValue}` } },
    },
    scales: {
      y: { beginAtZero: true, max: 1, ticks: { callback: (value) => `${Math.round(Number(value) * 100)}%` } },
    },
  };

  ngOnInit(): void {
    this.api
      .getImpacto()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          console.error('Falha ao carregar impacto de negocio', error);
          this.error.set('Nao foi possivel carregar o impacto de negocio.');
          this.loading.set(false);
          return of(null);
        })
      )
      .subscribe((payload) => {
        if (!payload) {
          return;
        }
        this.applyPayload(payload);
        this.loading.set(false);
      });
  }

  private applyPayload(payload: ImpactoResponse): void {
    const orderedClientes = [...(payload.clientes ?? [])].sort((a, b) => (b.variacao ?? 0) - (a.variacao ?? 0));
    const influencia = [...(payload.rede_influencia ?? [])].sort((a, b) => (b.influencia ?? 0) - (a.influencia ?? 0));

    this.clientes.set(orderedClientes);
    this.rede.set(influencia);
    this.resumo.set(payload.resumo ?? null);
    this.metadados.set(payload.metadados ?? null);
    this.limitesChart.set(this.buildLimitesChart(orderedClientes));
    this.redeChart.set(this.buildRedeChart(influencia));
  }

  getVariacao(cliente: ImpactoCliente): number {
    const variacao = cliente.variacao;
    if (typeof variacao === 'number') {
      return variacao;
    }
    return (cliente.limite_depois ?? 0) - (cliente.limite_antes ?? 0);
  }

  private buildLimitesChart(clientes: ImpactoCliente[]): BarData {
    const labels = clientes.map((cliente) => cliente.nome);
    return {
      labels,
      datasets: [
        {
          label: 'Limite atual',
          data: clientes.map((cliente) => cliente.limite_antes),
          backgroundColor: '#dbeafe',
          borderRadius: 6,
        },
        {
          label: 'Limite projetado',
          data: clientes.map((cliente) => cliente.limite_depois),
          backgroundColor: '#2563eb',
          borderRadius: 6,
        },
      ],
    };
  }

  private buildRedeChart(rede: RedeInfluencia[]): BarData {
    return {
      labels: rede.map((item) => item.cliente),
      datasets: [
        {
          label: 'Influencia em rede',
          data: rede.map((item) => Math.round(item.influencia * 100) / 100),
          backgroundColor: '#22c55e',
          borderRadius: 6,
        },
      ],
    };
  }
}
