import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
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
import { catchError, finalize, of } from 'rxjs';
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
  constructor(private router: Router) {}

  term = '';

  private readonly api = inject(ApiService);

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
    if (!raw) return;
    const digits = raw.replace(/\D/g, '');
    if (/^\d{14}$/.test(digits)) {
      this.router.navigate(['/empresa/cnpj', digits]);
    } else {
      this.router.navigate(['/empresa', raw]);
    }
  }

  private loadEmpresas(): void {
    this.api
      .getEmpresas()
      .pipe(takeUntilDestroyed())
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
      .pipe(takeUntilDestroyed(), finalize(() => this.scoreLoading.set(false)))
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
      .pipe(takeUntilDestroyed(), finalize(() => this.redeLoading.set(false)))
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
    this.api
      .getMacro('selic', from)
      .pipe(
        takeUntilDestroyed(),
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
      .pipe(takeUntilDestroyed(), finalize(() => this.alertasLoading.set(false)))
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
