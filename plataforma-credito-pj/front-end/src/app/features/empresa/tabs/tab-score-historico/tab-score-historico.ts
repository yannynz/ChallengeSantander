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
  ApexYAxis,
  ApexMarkers,
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
  yaxis?: ApexYAxis;
  markers?: ApexMarkers;
};

const createEmptyChart = (): ChartOptions => ({
  series: [{ name: 'Score', data: [] }],
  chart: { type: 'line', height: 280, toolbar: { show: false } },
  xaxis: { categories: [] },
  stroke: { curve: 'smooth', width: 3 },
  dataLabels: { enabled: false },
  title: { text: 'Evolucao do Score', align: 'left' },
});

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

  chart = signal<ChartOptions>(createEmptyChart());

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
            score: this.api
              .getEmpresaScore(resolvedId)
              .pipe(
                catchError((err) => {
                  console.error('Erro ao carregar score', err);
                  return of<EmpresaScoreResponse | null>(null);
                })
              ),
            decisoes: this.api
              .listDecisoes(resolvedId, 50)
              .pipe(catchError(() => of<Decisao[]>([]))),
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
          if (score) {
            this.scoreInfo.set(score);
          } else {
            this.scoreInfo.set(null);
          }

          const { hasData, lastValue } = this.updateChart(score, decisoes, resolvedId);

          if (score) {
            this.scorePercent.set(this.toPercent(score.score));
          } else {
            this.scorePercent.set(lastValue);
          }

          if (!hasData) {
            this.error.set('Nao foi possivel encontrar historico de score para esta empresa.');
          } else {
            this.error.set(null);
          }
        },
        error: (err) => {
          console.error('Erro ao carregar score', err);
          this.error.set('Nao foi possivel carregar o score da empresa.');
          this.scoreInfo.set(null);
          this.scorePercent.set(null);
          this.resetChart();
        },
      });
  }

  private updateChart(
    score: EmpresaScoreResponse | null,
    decisoes: Decisao[],
    empresaId: string
  ): { hasData: boolean; lastValue: number | null } {
    const points = new Map<number, { label: string; value: number }>();
    let fallbackKey = Number.MAX_SAFE_INTEGER;

    const upsertPoint = (date: Date | null, fallbackLabel: string, rawValue: number | null | undefined): void => {
      const numeric = this.toPercent(rawValue);
      const effectiveDate = date && !Number.isNaN(date.getTime()) ? date : null;
      const sortKey = effectiveDate ? effectiveDate.getTime() : fallbackKey--;
      const label = effectiveDate ? this.formatDateLabel(effectiveDate) : fallbackLabel || `P${points.size + 1}`;
      points.set(sortKey, { label, value: numeric });
    };

    if (Array.isArray(score?.historico) && score.historico.length) {
      const timestamps = Array.isArray(score?.['historicoTimestamps']) ? score['historicoTimestamps'] : [];
      score.historico.forEach((point, index) => {
        const targetDate = this.toDate(timestamps[index]);
        upsertPoint(targetDate, `P${index + 1}`, point);
      });
    }

    const history = decisoes
      .filter((dec) => dec.empresaId === empresaId)
      .slice()
      .sort((a, b) => new Date(a.dtDecisao).getTime() - new Date(b.dtDecisao).getTime());

    history.forEach((dec) => {
      const decisionDate = this.toDate(dec.dtDecisao);
      upsertPoint(decisionDate, this.formatDateLabel(decisionDate ?? dec.dtDecisao), dec.score);
    });

    if (!points.size && score) {
      upsertPoint(this.toDate(score['ultimaAtualizacaoScore'] as string | undefined), 'Atual', score.score);
    }

    if (!points.size) {
      this.resetChart();
      return { hasData: false, lastValue: null };
    }

    const ordered = Array.from(points.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, payload]) => payload);

    const categories = ordered.map((entry) => entry.label || '');
    const values = ordered.map((entry) => entry.value);

    this.chart.set({
      series: [{ name: 'Score', data: values }],
      chart: { type: 'line', height: 280, toolbar: { show: false } },
      xaxis: { categories, type: 'category' },
      yaxis: { min: 0, max: 100, labels: { formatter: (val: number) => `${val}%` } },
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
      markers: { size: 4 },
      title: { text: 'Evolucao do Score', align: 'left' },
    });

    const lastValue = ordered.length ? ordered[ordered.length - 1].value : null;
    return { hasData: true, lastValue };
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

  private formatDateLabel(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return typeof value === 'string' ? value : '';
    }
    return parsed.toLocaleString('pt-BR');
  }

  private toDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const parsed = new Date(value as string | number);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private resetChart(): void {
    this.chart.set(createEmptyChart());
  }
}
