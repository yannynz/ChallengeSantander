import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexDataLabels,
  ApexPlotOptions,
  ApexNonAxisChartSeries,
} from 'ng-apexcharts';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, of } from 'rxjs';
import { DataSet, Network, Node, Edge } from 'vis-network/standalone';

import {
  ApiService,
  EmpresaSummary,
  EmpresaScoreResponse,
  EmpresaRedeResponse,
  Decisao,
  MacroForecast,
} from '../../../shared/api';

type RadialChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  labels: string[];
};

type MacroChart = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
};

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    NgApexchartsModule,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    private router: Router,
    private readonly api: ApiService,
    private readonly destroyRef: DestroyRef
  ) {}

  term = '';

  empresas = signal<EmpresaSummary[]>([]);
  private currentEmpresaId: string | null = null;

  scoreLoading = signal(false);
  scoreError = signal<string | null>(null);
  scoreInfo = signal<EmpresaScoreResponse | null>(null);
  scoreOpts = signal<RadialChartOptions>(this.createRadialOptions(0, 'Score'));
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
  macroFonte = signal<string[]>([]);

  private readonly macroSeriesConfig = [
    { id: 'selic', label: 'Selic (%)' },
    { id: 'ipca', label: 'IPCA (%)' },
    { id: 'pib', label: 'PIB (%)' },
  ];

  alertasLoading = signal(false);
  alertasError = signal<string | null>(null);
  alertasSeries = signal<ApexAxisChartSeries>([]);
  alertasChart: ApexChart = { type: 'bar', height: 260 };
  alertasXAxis = signal<ApexXAxis>({ categories: [] });
  alertasPlot: ApexPlotOptions = { bar: { columnWidth: '45%', borderRadius: 6 } };

  redeLoading = signal(false);
  redeError = signal<string | null>(null);
  hasRedeData = signal(false);
  private network?: Network;
  private graphReady = false;
  private pendingRedeId: string | null = null;

  @ViewChild('graph', { static: true }) graphRef!: ElementRef<HTMLDivElement>;

  ngOnInit(): void {
    this.loadEmpresas();
    this.loadMacro();
    this.loadAlertas();
  }

  ngAfterViewInit(): void {
    this.graphReady = true;
    if (this.pendingRedeId) {
      this.loadRede(this.pendingRedeId);
      this.pendingRedeId = null;
    } else if (this.currentEmpresaId) {
      this.loadRede(this.currentEmpresaId);
    }
  }

  ngOnDestroy(): void {
    this.destroyNetwork();
  }

  onSearch(): void {
    const raw = (this.term || '').trim();
    if (!raw) {
      return;
    }

    const canonical = this.toCanonicalIdentifier(raw);
    if (!canonical) {
      return;
    }

    if (canonical.startsWith('CNPJ_') || /^\d{14}$/.test(canonical)) {
      this.router.navigate(['/empresa/cnpj', canonical]);
    } else {
      this.router.navigate(['/empresa', canonical]);
    }
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

  private loadEmpresas(): void {
    this.api
      .getEmpresas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          this.empresas.set(lista);
          const primeira = lista[0];
          const id = (primeira?.id ?? primeira?.cnpj ?? '').toString().trim();
          if (!id) {
            this.scoreError.set('Nenhuma empresa encontrada.');
            this.redeError.set('Nenhuma empresa encontrada.');
            return;
          }

          this.currentEmpresaId = id;
          this.loadScore(id);
          this.scheduleRede(id);
        },
        error: (err) => {
          console.error('Erro ao buscar empresas', err);
          this.scoreError.set('Nao foi possivel carregar as empresas.');
          this.redeError.set('Nao foi possivel carregar as empresas.');
        },
      });
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
          const percent = this.toPercent(score?.score);
          const labelParts: string[] = [];
          if (score?.modelo) {
            labelParts.push(`Modelo ${score.modelo}`);
          }
          if (score?.versao) {
            labelParts.push(`v${score.versao}`);
          }
          const label = labelParts.length ? labelParts.join(' ') : 'Score atual';
          this.scoreOpts.set(this.createRadialOptions(percent, label));
        },
        error: (err) => {
          console.error('Erro ao carregar score', err);
          this.scoreError.set('Nao foi possivel carregar o score.');
          this.scoreInfo.set(null);
          this.scoreOpts.set(this.createRadialOptions(0, 'Score'));
        },
      });
  }

  private scheduleRede(empresaId: string): void {
    if (this.graphReady) {
      this.loadRede(empresaId);
    } else {
      this.pendingRedeId = empresaId;
    }
  }

  private loadRede(empresaId: string): void {
    if (!this.graphRef?.nativeElement) {
      return;
    }

    this.redeLoading.set(true);
    this.api
      .getEmpresaRede(empresaId)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.redeLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.redeError.set(null);
          this.renderRede(response);
        },
        error: (err) => {
          console.error('Erro ao carregar rede', err);
          this.redeError.set('Nao foi possivel carregar a rede.');
          this.hasRedeData.set(false);
          this.destroyNetwork();
        },
      });
  }

  private renderRede(response: EmpresaRedeResponse): void {
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
      this.network = new Network(this.graphRef.nativeElement, data, options);
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
    const horizonte = 6;
    const seriesIds = this.macroSeriesConfig.map((item) => item.id);

    this.api
      .getMacroSeries(seriesIds, from, horizonte)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((series) => this.mergeMacroSeries(seriesIds, series)),
        catchError((err) => {
          console.error('Erro ao carregar macro', err);
          this.macroError.set('Nao foi possivel carregar dados macroeconomicos.');
          this.macroFonte.set([]);
          this.macro.set({
            series: [],
            chart: { type: 'line', height: 260 },
            xaxis: { categories: [] },
            stroke: { curve: 'smooth', width: 3 },
            dataLabels: { enabled: false },
          });
          return of<{ id: string; data: MacroForecast | null }[]>([]);
        }),
        finalize(() => this.macroLoading.set(false))
      )
      .subscribe((macroList) => {
        if (!macroList?.length) {
          this.macroFonte.set([]);
          return;
        }

        this.macroError.set(null);
        this.updateMacroChart(macroList);
      });
  }

  private mergeMacroSeries(
    requestedIds: string[],
    payload: MacroForecast[]
  ): Array<{ id: string; data: MacroForecast | null }> {
    const responseById = new Map<string, MacroForecast>();
    const fallbackEntries: Array<{ id: string; data: MacroForecast | null }> = [];

    for (const item of payload ?? []) {
      if (!item) {
        continue;
      }
      const key = (item.serieId ?? item.requestedSerie ?? '').toLowerCase();
      if (key) {
        responseById.set(key, item);
      } else {
        fallbackEntries.push({ id: `serie_${fallbackEntries.length}`, data: item });
      }
    }

    const mapped = requestedIds.map((requested) => {
      const key = requested.toLowerCase();
      const data = responseById.get(key) ?? null;
      responseById.delete(key);
      return { id: requested, data };
    });

    responseById.forEach((data, key) => {
      if (!requestedIds.some((requested) => requested.toLowerCase() === key)) {
        mapped.push({ id: key, data });
      }
    });

    return mapped.concat(fallbackEntries);
  }

  private updateMacroChart(macroList: Array<{ id: string; data: MacroForecast | null }>): void {
    const valid = macroList.filter(({ data }) => Array.isArray(data?.serie) && data?.historicoTimestamps);
    if (!valid.length) {
      this.macro.set({
        series: [],
        chart: { type: 'line', height: 260 },
        xaxis: { categories: [] },
        stroke: { curve: 'smooth', width: 3 },
        dataLabels: { enabled: false },
      });
      this.macroFonte.set([]);
      return;
    }

    const categoriesSet = new Set<string>();
    valid.forEach(({ data }) => {
      data?.historicoTimestamps?.forEach((ts) => categoriesSet.add(this.formatMacroLabel(ts)));
      data?.forecastTimestamps?.forEach((ts) => categoriesSet.add(this.formatMacroLabel(ts)));
    });

    const categories = Array.from(categoriesSet.values()).sort((a, b) => {
      const diff = new Date(a).valueOf() - new Date(b).valueOf();
      return Number.isNaN(diff) ? a.localeCompare(b) : diff;
    });

    const series: ApexAxisChartSeries = valid.map(({ id, data }) => {
      const historicoMap = new Map<string, number>();
      const forecastMap = new Map<string, number>();

      (data?.historicoTimestamps ?? []).forEach((ts, idx) => {
        const value = data?.serie?.[idx];
        if (typeof value === 'number' && Number.isFinite(value)) {
          historicoMap.set(this.formatMacroLabel(ts), value);
        }
      });

      (data?.forecastTimestamps ?? []).forEach((ts, idx) => {
        const value = data?.forecast?.[idx];
        if (typeof value === 'number' && Number.isFinite(value)) {
          forecastMap.set(this.formatMacroLabel(ts), value);
        }
      });

      const dataset = categories.map((ts) => {
        if (historicoMap.has(ts)) {
          return historicoMap.get(ts) ?? null;
        }
        if (forecastMap.has(ts)) {
          return forecastMap.get(ts) ?? null;
        }
        return null;
      });

      return {
        name: this.resolveMacroLabel(id, data?.descricao),
        data: dataset,
      };
    });

    this.macro.set({
      series,
      chart: { type: 'line', height: 260 },
      xaxis: { categories },
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
    });

    const fontes = new Set<string>();
    valid.forEach(({ data }) => {
      if (data?.fonte) {
        fontes.add(data.fonte);
      }
    });
    this.macroFonte.set(Array.from(fontes.values()));
  }

  private resolveMacroLabel(id: string, descricao?: string): string {
    const config = this.macroSeriesConfig.find((serie) => serie.id === id.toLowerCase());
    if (config) {
      return config.label;
    }
    if (descricao) {
      return descricao;
    }
    return id.toUpperCase();
  }

  private formatMacroLabel(value: string | number): string {
    const text = String(value);
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return text;
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
          console.error('Erro ao carregar alertas', err);
          this.alertasError.set('Nao foi possivel carregar o resumo das decisoes.');
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

  private createRadialOptions(value: number, label: string): RadialChartOptions {
    const normalized = Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
    return {
      series: [normalized],
      chart: { type: 'radialBar', height: 260 },
      plotOptions: {
        radialBar: {
          hollow: { size: '65%' },
          dataLabels: {
            value: {
              formatter: (v: number) => `${v.toFixed(1)}%`,
            },
          },
        },
      },
      labels: [label],
    };
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
}
