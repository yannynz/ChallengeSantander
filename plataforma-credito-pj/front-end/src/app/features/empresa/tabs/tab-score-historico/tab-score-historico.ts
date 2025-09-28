import { Component, DestroyRef, Input, OnChanges, SimpleChanges, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexDataLabels,
  ApexTitleSubtitle,
} from 'ng-apexcharts';
import { ApiService, Decisao, EmpresaScoreResponse } from '../../../../shared/api';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  title: ApexTitleSubtitle;
};

@Component({
  standalone: true,
  selector: 'app-tab-score-historico',
  imports: [CommonModule, MatCardModule, NgApexchartsModule],
  template: `
    <mat-card>
      <mat-card-title>Score e Historico</mat-card-title>

      <div class="px-3 pb-2 text-sm tab-subtitle" *ngIf="scorePercent() !== null && !loading() && !error()">
        Score atual: {{ scoreText() }}%
      </div>

      <ng-container *ngIf="!loading(); else loadingTpl">
        <div *ngIf="error()" class="px-3 pb-3 text-sm" style="color:#b91c1c;">{{ error() }}</div>
        <apx-chart
          *ngIf="!error()"
          [series]="chart().series"
          [chart]="chart().chart"
          [xaxis]="chart().xaxis"
          [stroke]="chart().stroke"
          [dataLabels]="chart().dataLabels"
          [title]="chart().title">
        </apx-chart>
      </ng-container>

      <ng-template #loadingTpl>
        <div class="px-3 py-5 text-sm">Carregando score...</div>
      </ng-template>
    </mat-card>
  `,
})
export class TabScoreHistoricoComponent implements OnChanges {
  @Input() empresaId?: string | number | null;
  @Input() cnpj?: string | null;

  constructor(
    private readonly api: ApiService,
    private readonly destroyRef: DestroyRef
  ) {}

  loading = signal(false);
  error = signal<string | null>(null);
  scoreInfo = signal<EmpresaScoreResponse | null>(null);
  scorePercent = signal<number | null>(null);
  scoreText = computed(() => {
    const value = this.scorePercent();
    return value === null ? '--' : value.toFixed(1);
  });

  chart = signal<ChartOptions>({
    series: [{ name: 'Score', data: [] }],
    chart: { type: 'line', height: 280, toolbar: { show: false } },
    xaxis: { categories: [] },
    stroke: { curve: 'smooth', width: 3 },
    dataLabels: { enabled: false },
    title: { text: 'Evolucao do Score', align: 'left' },
  });

  private currentEmpresaId: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!('empresaId' in changes || 'cnpj' in changes)) {
      return;
    }

    const next = (this.empresaId ?? this.cnpj ?? '').toString().trim();
    if (!next || next === this.currentEmpresaId) {
      return;
    }

    this.currentEmpresaId = next;
    this.loadData(next);
  }

  private loadData(identifier: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.api
      .resolveEmpresaId(identifier)
      .pipe(
        switchMap((resolvedId) => {
          if (!resolvedId) {
            this.error.set('Empresa nao encontrada.');
            return of(null);
          }

          return forkJoin({
            resolvedId: of(resolvedId),
            score: this.api.getEmpresaScore(resolvedId),
            decisoes: this.api.listDecisoes().pipe(catchError(() => of<Decisao[]>([]))),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (payload) => {
          if (!payload) {
            this.scoreInfo.set(null);
            this.scorePercent.set(null);
            this.chart.set({
              series: [{ name: 'Score', data: [] }],
              chart: { type: 'line', height: 280, toolbar: { show: false } },
              xaxis: { categories: [] },
              stroke: { curve: 'smooth', width: 3 },
              dataLabels: { enabled: false },
              title: { text: 'Evolucao do Score', align: 'left' },
            });
            return;
          }

          const { resolvedId, score, decisoes } = payload;
          this.scoreInfo.set(score);
          this.scorePercent.set(this.toPercent(score?.score));
          this.updateChart(score, decisoes, resolvedId);
        },
        error: (err) => {
          console.error('Erro ao carregar score', err);
          this.error.set('Nao foi possivel carregar o score da empresa.');
          this.scoreInfo.set(null);
          this.scorePercent.set(null);
        },
      });
  }

  private updateChart(score: EmpresaScoreResponse, decisoes: Decisao[], empresaId: string): void {
    const history = decisoes
      .filter((dec) => dec.empresaId === empresaId)
      .slice()
      .sort((a, b) => new Date(a.dtDecisao).getTime() - new Date(b.dtDecisao).getTime());

    const categories: string[] = [];
    const values: number[] = [];

    if (history.length) {
      history.forEach((dec) => {
        categories.push(new Date(dec.dtDecisao).toLocaleDateString('pt-BR'));
        values.push(this.toPercent(dec.score));
      });
    }

    if (!values.length && Array.isArray(score?.historico) && score.historico?.length) {
      score.historico.forEach((point, index) => {
        categories.push(`P${index + 1}`);
        values.push(this.toPercent(point));
      });
    }

    if (!values.length) {
      categories.push('Atual');
      values.push(this.toPercent(score?.score));
    }

    this.chart.set({
      series: [{ name: 'Score', data: values }],
      chart: { type: 'line', height: 280, toolbar: { show: false } },
      xaxis: { categories },
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
      title: { text: 'Evolucao do Score', align: 'left' },
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

    return numeric > 1 ? Number(numeric.toFixed(2)) : Number((numeric * 100).toFixed(2));
  }
}
