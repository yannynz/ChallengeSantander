import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

import { ApiService, ExplainResponse, ExplainMetadata } from '../../../shared/api';

type BarData = ChartConfiguration<'bar'>['data'];

@Component({
  standalone: true,
  selector: 'app-explicabilidade',
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, RouterLink, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './explicabilidade.html',
  styleUrls: ['./explicabilidade.scss'],
})
export class ExplicabilidadeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    clienteId: ['CLI001', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly explicacao = signal<ExplainResponse | null>(null);
  readonly metadados = computed<ExplainMetadata | null>(() => this.explicacao()?.metadados ?? null);

  readonly fatoresChart = signal<BarData>({ labels: [], datasets: [] });
  readonly fatoresOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label ?? 'Impacto'}: ${context.formattedValue}`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `${Number(value) >= 0 ? '+' : ''}${value}`,
        },
      },
    },
  };

  readonly scorePercent = computed(() => {
    const data = this.explicacao();
    return data ? Math.round(data.score_modelo * 100) : 0;
  });

  readonly riscoAtual = computed(() => this.explicacao()?.nivel_risco ?? '--');

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.error.set(null));

    const inicial = this.form.get('clienteId')?.value ?? '';
    if (inicial) {
      this.buscar(inicial);
    }
  }

  onSubmit(): void {
    const raw = (this.form.value.clienteId ?? '').trim();
    if (!raw) {
      this.error.set('Informe um identificador valido (letras e numeros).');
      return;
    }

    this.buscar(raw);
  }

  private buscar(clienteId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .getExplain(clienteId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          console.error('Falha ao obter explicabilidade', error);
          this.error.set('Nao foi possivel carregar a explicabilidade.');
          this.loading.set(false);
          return of(null);
        })
      )
      .subscribe((payload) => {
        if (!payload) {
          return;
        }
        this.explicacao.set(payload);
        this.fatoresChart.set(this.buildChart(payload));
        this.loading.set(false);
      });
  }

  private buildChart(payload: ExplainResponse): BarData {
    const fatores = Object.entries(payload.fatores ?? {}).map(([fator, peso]) => ({
      fator,
      peso,
    }));

    fatores.sort((a, b) => Math.abs(b.peso) - Math.abs(a.peso));

    return {
      labels: fatores.map((item) => item.fator),
      datasets: [
        {
          label: 'Impacto no score',
          data: fatores.map((item) => Number(item.peso.toFixed(3))),
          backgroundColor: fatores.map((item) => (item.peso >= 0 ? '#22c55e' : '#ef4444')),
          borderRadius: 6,
        },
      ],
    };
  }
}
