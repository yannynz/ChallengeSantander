import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexDataLabels,
  ApexPlotOptions,
  ApexYAxis,
  ApexMarkers,
} from 'ng-apexcharts';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';
import { DataSet, Network, Node, Edge } from 'vis-network/standalone';
import { ActivatedRoute, Router } from '@angular/router';

import {
  ApiService,
  EmpresaScoreResponse,
  EmpresaRedeResponse,
  Decisao,
  MacroForecast,
} from '../../../shared/api';

type ScoreChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  yaxis: ApexYAxis;
  markers: ApexMarkers;
};

type MacroChart = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
};

type ViewState = 'initial' | 'loading' | 'ready' | 'error';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, MatCardModule, NgApexchartsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  term = '';

  viewState = signal<ViewState>('initial');
  viewMessage = signal<string | null>(null);

  scoreLoading = signal(false);
  scoreError = signal<string | null>(null);
  scoreInfo = signal<EmpresaScoreResponse | null>(null);
  scoreChart = signal<ScoreChartOptions>(this.createScoreChart([], []));
  scoreCurrent = computed(() => {
    const info = this.scoreInfo();
    if (!info) {
      return '--';
    }
    const percent = this.toPercent(info.score);
    return `${percent.toFixed(1)}%`;
  });
  scoreSubtitle = computed(() => {
    const info = this.scoreInfo();
    if (!info) {
      return 'Sem dados disponiveis';
    }

    const parts: string[] = [];
    if (info.modelo) {
      parts.push(`Modelo ${info.modelo}`);
    }
    if (info.versao) {
      parts.push(`v${info.versao}`);
    }

    return parts.length ? parts.join(' - ') : 'Sem detalhes do modelo';
  });

  macroLoading = signal(false);
  macroError = signal<string | null>(null);
  macro = signal<MacroChart>({
    series: [],
    chart: { type: 'line', height: 260 },
    xaxis: { categories: [] },
    stroke: { curve: 'smooth', width: 3 },
    dataLabels: { enabled: false },
  });

  alertasLoading = signal(false);
  alertasError = signal<string | null>(null);
  alertasSeries = signal<ApexAxisChartSeries>([]);
  alertasChart: ApexChart = { type: 'bar', height: 260 };
  alertasXAxis = signal<ApexXAxis>({ categories: [] });
  alertasPlot: ApexPlotOptions = { bar: { columnWidth: '45%', borderRadius: 6 } };

  redeLoading = signal(false);
  redeError = signal<string | null>(null);
  hasRedeData = signal(false);

  private currentEmpresaId: string | null = null;
  private network?: Network;
  private pendingRedeId: string | null = null;
  private graphHost?: ElementRef<HTMLDivElement>;

  constructor(
    private readonly api: ApiService,
    private readonly destroyRef: DestroyRef,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const termParam = (params.get('term') ?? '').trim();

        if (!termParam) {
          this.term = '';
          if (this.viewState() !== 'initial') {
            this.resetDataStates();
            this.viewState.set('initial');
          }
          return;
        }

        if (termParam === this.term) {
          return;
        }

        this.searchTerm(termParam, { source: 'query' });
      });
  }

  @ViewChild('graph')
  set graphRef(ref: ElementRef<HTMLDivElement> | undefined) {
    this.graphHost = ref;
    if (ref && this.pendingRedeId) {
      const pending = this.pendingRedeId;
      this.pendingRedeId = null;
      this.loadRede(pending);
    }
  }

  get graphRef(): ElementRef<HTMLDivElement> | undefined {
    return this.graphHost;
  }

  ngOnDestroy(): void {
    this.destroyNetwork();
  }

  empresaSelecionada(): string | null {
    return this.currentEmpresaId;
  }

  onSearch(): void {
    const raw = (this.term || '').trim();
    if (!raw) {
      return;
    }

    this.searchTerm(raw, { source: 'user' });
  }

  private searchTerm(raw: string, opts: { source: 'user' | 'query' }): void {
    const canonical = this.toCanonicalIdentifier(raw);
    if (!canonical) {
      return;
    }

    this.term = canonical;

    if (opts.source === 'user') {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { term: canonical },
        queryParamsHandling: 'merge',
      });
    }

    this.viewState.set('loading');
    this.viewMessage.set(null);
    this.resetDataStates();

    this.api
      .resolveEmpresaId(canonical)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          console.error('Erro ao resolver empresa', err);
          this.handleSearchError('Nao encontramos dados para o identificador informado.');
          return of('');
        })
      )
      .subscribe((resolved) => {
        const id = (resolved || '').trim();
        if (!id) {
          this.handleSearchError('Nao encontramos dados para o identificador informado.');
          return;
        }

        this.currentEmpresaId = id;
        this.viewState.set('ready');
        this.loadScore(id);
        this.scheduleRede(id);
        this.loadMacro();
        this.loadAlertas();
      });
  }

  private handleSearchError(message: string): void {
    this.currentEmpresaId = null;
    this.viewState.set('error');
    this.viewMessage.set(message);
    this.destroyNetwork();
  }

  goToDetalhe(section: 'score' | 'rede' | 'macro' | 'decisoes'): void {
    const term = (this.currentEmpresaId ?? this.term).trim();

    if (section === 'macro') {
      if (term) {
        this.router.navigate(['/kpis'], { queryParams: { term } });
      } else {
        this.router.navigate(['/kpis']);
      }
      return;
    }

    if (!this.currentEmpresaId) {
      return;
    }

    const baseParams: Record<string, string> = term ? { term } : {};

    if (section === 'rede') {
      this.router.navigate(['/empresa', this.currentEmpresaId], { queryParams: { ...baseParams, tab: 'rede' } });
      return;
    }

    if (section === 'decisoes') {
      this.router.navigate(['/empresa', this.currentEmpresaId], { queryParams: { ...baseParams, tab: 'decisoes' } });
      return;
    }

    this.router.navigate(['/empresa', this.currentEmpresaId], {
      queryParams: Object.keys(baseParams).length ? baseParams : undefined,
    });
  }

  private resetDataStates(): void {
    this.currentEmpresaId = null;
    this.scoreLoading.set(false);
    this.scoreError.set(null);
    this.scoreInfo.set(null);
    this.scoreChart.set(this.createScoreChart([], []));

    this.redeLoading.set(false);
    this.redeError.set(null);
    this.hasRedeData.set(false);
    this.pendingRedeId = null;
    this.destroyNetwork();

    this.macroLoading.set(false);
    this.macroError.set(null);
    this.macro.set({
      series: [],
      chart: { type: 'line', height: 260 },
      xaxis: { categories: [] },
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
    });

    this.alertasLoading.set(false);
    this.alertasError.set(null);
    this.alertasSeries.set([]);
    this.alertasXAxis.set({ categories: [] });
  }

  private loadScore(empresaId: string): void {
    this.scoreLoading.set(true);
    this.api
      .getEmpresaScore(empresaId)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.scoreLoading.set(false)))
      .subscribe({
        next: (score) => {
          this.scoreError.set(null);
          this.scoreInfo.set(score);
          this.updateScoreChart(score);
        },
        error: (err) => {
          console.error('Erro ao carregar score', err);
          this.scoreError.set('Nao foi possivel carregar o score.');
          this.scoreInfo.set(null);
          this.scoreChart.set(this.createScoreChart([], []));
        },
      });
  }

  private scheduleRede(empresaId: string): void {
    if (this.graphRef?.nativeElement) {
      this.loadRede(empresaId);
    } else {
      this.pendingRedeId = empresaId;
    }
  }

  private loadRede(empresaId: string): void {
    const host = this.graphRef?.nativeElement;
    if (!host) {
      this.pendingRedeId = empresaId;
      return;
    }

    this.redeLoading.set(true);
    this.api
      .getEmpresaRede(empresaId)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.redeLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.redeError.set(null);
          this.renderRede(response, host);
        },
        error: (err) => {
          console.error('Erro ao carregar rede', err);
          this.redeError.set('Nao foi possivel carregar a rede.');
          this.hasRedeData.set(false);
          this.destroyNetwork();
        },
      });
  }

  private renderRede(response: EmpresaRedeResponse, host: HTMLDivElement): void {
    const nodesRaw = Array.isArray(response?.nodes) ? response.nodes : [];
    const edgesRaw = Array.isArray(response?.edges) ? response.edges : [];

    const nodes: Node[] = nodesRaw
      .map((node, index) => {
        const id = (node?.id ?? index) as string | number;
        if (id === undefined || id === null) {
          return null;
        }
        return {
          id,
          label: node?.label ?? String(id),
          value: typeof node?.value === 'number' ? node.value : undefined,
        } as Node;
      })
      .filter((n): n is Node => !!n);

    const edges: Edge[] = edgesRaw
      .map((edge, index) => {
        const from = (edge?.from ?? edge?.source) as string | number | undefined;
        const to = (edge?.to ?? edge?.target) as string | number | undefined;
        if (from === undefined || to === undefined) {
          return null;
        }
        const value = edge?.value ?? edge?.weight;
        return {
          id: (edge?.id ?? index) as string | number,
          from,
          to,
          value: typeof value === 'number' ? value : undefined,
        } as Edge;
      })
      .filter((edge): edge is Edge => !!edge);

    if (!nodes.length) {
      this.hasRedeData.set(false);
      this.destroyNetwork();
      return;
    }

    const data = {
      nodes: new DataSet<Node>(nodes),
      edges: new DataSet<Edge>(edges),
    };

    const options = {
      nodes: { shape: 'dot', size: 12 },
      edges: { arrows: 'to', scaling: { min: 1, max: 5 } },
      physics: { stabilization: true },
    };

    this.hasRedeData.set(true);

    if (this.network) {
      this.network.setData(data);
      this.network.setOptions(options);
    } else {
      this.network = new Network(host, data, options);
    }
  }

  private destroyNetwork(): void {
    if (this.network) {
      this.network.destroy();
      this.network = undefined;
    }
  }

  private loadMacro(): void {
    this.macroLoading.set(true);
    const from = this.defaultFromDate();
    this.api
      .getMacro('selic', from)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.macroLoading.set(false)),
        catchError((err) => {
          console.error('Erro ao carregar macro', err);
          this.macroError.set('Nao foi possivel carregar dados macroeconomicos.');
          this.macro.set({
            series: [],
            chart: { type: 'line', height: 260 },
            xaxis: { categories: [] },
            stroke: { curve: 'smooth', width: 3 },
            dataLabels: { enabled: false },
          });
          return of<MacroForecast | null>(null);
        })
      )
      .subscribe((macro) => {
        if (!macro) {
          return;
        }

        this.macroError.set(null);
        this.updateMacroChart(macro);
      });
  }

  private updateMacroChart(macro: MacroForecast): void {
    const historico = Array.isArray(macro?.serie)
      ? macro.serie.map((n) => Number(n)).filter((n) => Number.isFinite(n))
      : [];
    const forecast = Array.isArray(macro?.forecast)
      ? macro.forecast.map((n) => Number(n)).filter((n) => Number.isFinite(n))
      : [];

    const total = Math.max(1, historico.length + forecast.length);
    const categories = Array.from({ length: total }, (_, idx) =>
      idx < historico.length ? `H${idx + 1}` : `F${idx - historico.length + 1}`
    );

    const historicoData = Array.from({ length: total }, (_, idx) =>
      idx < historico.length ? historico[idx] : null
    );
    const forecastData = Array.from({ length: total }, (_, idx) =>
      idx < historico.length ? null : forecast[idx - historico.length] ?? null
    );

    const series: ApexAxisChartSeries = [
      { name: 'Historico', data: historicoData },
      { name: 'Forecast', data: forecastData },
    ];

    this.macro.set({
      series,
      chart: { type: 'line', height: 260 },
      xaxis: { categories },
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
    });
  }

  private loadAlertas(): void {
    this.alertasLoading.set(true);
    this.api
      .listDecisoes()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.alertasLoading.set(false)))
      .subscribe({
        next: (lista: Decisao[]) => {
          this.alertasError.set(null);
          const counts = new Map<string, number>();
          lista.forEach((dec) => {
            const key = dec.decisao ?? (dec.aprovacao ? 'APROVADO' : 'REPROVADO');
            counts.set(key, (counts.get(key) ?? 0) + 1);
          });

          if (!counts.size) {
            this.alertasSeries.set([{ name: 'Decisoes', data: [0] }]);
            this.alertasXAxis.set({ categories: ['Sem dados'] });
            return;
          }

          const categories = Array.from(counts.keys());
          const data = categories.map((cat) => counts.get(cat) ?? 0);
          this.alertasSeries.set([{ name: 'Decisoes', data }]);
          this.alertasXAxis.set({ categories });
        },
        error: (err) => {
          console.error('Erro ao carregar Decisoes', err);
          this.alertasError.set('Nao foi possivel carregar o resumo das Decisoes.');
          this.alertasSeries.set([{ name: 'Decisoes', data: [] }]);
          this.alertasXAxis.set({ categories: [] });
        },
      });
  }

  private defaultFromDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 12);
    return date.toISOString().slice(0, 10);
  }

  private toCanonicalIdentifier(term: string): string | null {
    const trimmed = term.trim();
    if (!trimmed) {
      return null;
    }

    const digits = trimmed.replace(/\D/g, '');
    if (digits) {
      if (digits.length >= 14) {
        const normalized = digits.slice(-14);
        return normalized.padStart(14, '0');
      }
      const suffix = digits.slice(-5).padStart(5, '0');
      return `CNPJ_${suffix}`;
    }

    return trimmed.toUpperCase();
  }

  private toPercent(value: number | null | undefined): number {
    if (value === null || value === undefined) {
      console.warn('[Dashboard] Valor de score ausente, assumindo 0');
      return 0;
    }
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) {
      console.warn('[Dashboard] Valor de score inválido, assumindo 0', value);
      return 0;
    }
    const scaled = numeric > 1 ? numeric : numeric * 100;
    return Number(scaled.toFixed(2));
  }

  private updateScoreChart(score: EmpresaScoreResponse | null): void {
    if (!score) {
      this.scoreChart.set(this.createScoreChart([], []));
      return;
    }

    const points: Array<{ label: string; value: number }> = [];
    const historico = Array.isArray(score.historico) ? score.historico : [];
    const timestamps = Array.isArray((score as Record<string, unknown>)['historicoTimestamps'])
      ? ((score as Record<string, unknown>)['historicoTimestamps'] as unknown[])
      : [];

    historico.forEach((rawValue, index) => {
      const value = this.toPercent(rawValue as number | null | undefined);
      const label = this.formatDateLabel(timestamps[index]) || `P${index + 1}`;
      points.push({ label, value });
    });

    if (!points.length) {
      const fallbackLabel = this.formatDateLabel((score as Record<string, unknown>)['ultimaAtualizacaoScore']) || 'Atual';
      points.push({ label: fallbackLabel, value: this.toPercent(score.score) });
    }

    if (!points.length) {
      console.warn('[Dashboard] Historico de score ausente para grafico.');
      this.scoreChart.set(this.createScoreChart([], []));
      return;
    }

    const categories = points.map((point) => point.label);
    const data = points.map((point) => point.value);
    this.scoreChart.set(this.createScoreChart(data, categories));
  }

  private formatDateLabel(value: unknown): string {
    if (!value) {
      return '';
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? '' : value.toLocaleDateString('pt-BR');
    }
    const parsed = new Date(value as string | number);
    if (Number.isNaN(parsed.getTime())) {
      return typeof value === 'string' ? value : '';
    }
    return parsed.toLocaleDateString('pt-BR');
  }

  private createScoreChart(data: number[], categories: string[]): ScoreChartOptions {
    return {
      series: [{ name: 'Score', data }],
      chart: { type: 'line', height: 260, toolbar: { show: false } },
      xaxis: { categories, type: 'category' },
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
      yaxis: { min: 0, max: 100, labels: { formatter: (val: number) => `${val.toFixed(0)}%` } },
      markers: { size: 4 },
    };
  }
}
