import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, concatMap, defaultIfEmpty, filter, from, map, of, take } from 'rxjs';

export interface EmpresaSummary {
  id: string;
  cnpj?: string;
  dsCnae?: string;
  dtAbrt?: string;
}

export interface EmpresaScoreResponse {
  score: number;
  modelo?: string;
  versao?: string;
  explicacoes?: Record<string, number>;
  historico?: number[];
  [key: string]: unknown;
}

export interface GraphNode {
  id: string | number;
  label?: string;
  group?: string;
  value?: number;
}

export interface GraphEdge {
  id?: string | number;
  from?: string | number;
  to?: string | number;
  source?: string | number;
  target?: string | number;
  value?: number;
  weight?: number;
}

export interface EmpresaRedeResponse {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  [key: string]: unknown;
}

export interface MacroForecast {
  serie?: number[];
  forecast?: number[];
  horizonte?: number;
  timestamps?: Array<string | number>;
  historicoTimestamps?: string[];
  forecastTimestamps?: string[];
  fonte?: string;
  serieId?: string;
  descricao?: string;
  ultimaAtualizacao?: string;
  requestedSerie?: string;
  [key: string]: unknown;
}

export interface MacroSeriesResponse {
  series?: MacroForecast[];
  requested?: string[];
  count?: number;
  [key: string]: unknown;
}

export interface Decisao {
  id: string;
  empresaId: string;
  dtDecisao: string;
  score?: number | null;
  aprovacao: boolean;
  limite?: number | null;
  moeda?: string | null;
  motivo?: string | null;
  decisao?: string | null;
}

export interface ImpactoMetadata {
  atualizado_em?: string;
  fonte?: string;
  amostra?: number;
  janela_dias?: number;
  [key: string]: unknown;
}

export interface ImpactoCliente {
  empresa_id: string;
  nome: string;
  segmento?: string;
  score: number;
  limite_antes: number;
  limite_depois: number;
  variacao?: number;
  moeda?: string;
  aprovacao?: boolean | null;
  modelo?: string;
  versao_modelo?: string;
  dt_decisao?: string | null;
  dt_decisao_anterior?: string | null;
  [key: string]: unknown;
}

export interface RedeInfluencia {
  cliente: string;
  influencia: number;
  grau?: number;
  betweenness?: number;
  dt_calc?: string;
  [key: string]: unknown;
}

export interface ImpactoResponse {
  clientes: ImpactoCliente[];
  rede_influencia: RedeInfluencia[];
  resumo?: string;
  metadados?: ImpactoMetadata;
  [key: string]: unknown;
}

export interface ExplainMetadata {
  gerado_em?: string;
  threshold_sugerido?: number;
  versao_modelo?: string;
  dt_financeiro?: string;
  fonte?: string;
  [key: string]: unknown;
}

export interface ExplainResponse {
  id_cliente: string;
  score_modelo: number;
  nivel_risco: string;
  fatores: Record<string, number>;
  modelo?: string;
  observacoes?: string[];
  metadados?: ExplainMetadata;
  [key: string]: unknown;
}

export interface HistoricoAuc {
  periodo: string;
  auc: number;
}

export interface MetricsResponse {
  classificacao: Record<string, number>;
  clusterizacao: Record<string, number>;
  historico_auc?: HistoricoAuc[];
  atualizado_em?: string;
  fonte?: string;
  janela_dias?: number;
  drift_psi?: number;
  [key: string]: unknown;
}

export interface SimuladorRequest {
  renda: number;
  idade: number;
  historico: number;
  conexoes_rede: number;
  usuario?: string;
  [key: string]: unknown;
}

export interface SimuladorMetadata {
  gerado_em?: string;
  fonte?: string;
  [key: string]: unknown;
}

export interface SimuladorResponse {
  score: number;
  risco: string;
  modelo?: string;
  influencia_rede: number;
  limite_sugerido: number;
  mensagem?: string;
  metadados?: SimuladorMetadata;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = this.resolveApiBaseUrl();
  private readonly useRealStorytelling = this.resolveStorytellingFlag();

  getEmpresas(): Observable<EmpresaSummary[]> {
    return this.http.get<EmpresaSummary[]>(`${this.base}/empresas`);
  }

  getEmpresa(idOrCnpj: string): Observable<EmpresaSummary> {
    return this.http.get<EmpresaSummary>(`${this.base}/empresas/${idOrCnpj}`);
  }

  getEmpresaScore(idOrCnpj: string): Observable<EmpresaScoreResponse> {
    return this.http.get<EmpresaScoreResponse>(`${this.base}/empresas/${idOrCnpj}/score`);
  }

  getEmpresaRede(idOrCnpj: string): Observable<EmpresaRedeResponse> {
    return this.http.get<EmpresaRedeResponse>(`${this.base}/empresas/${idOrCnpj}/rede`);
  }

  getMacro(serie: string, from: string, horizonte?: number): Observable<MacroForecast> {
    const series = this.normalizeMacroSeries([serie]);
    if (!series.length) {
      return of({} as MacroForecast);
    }

    const params = this.buildMacroParams(series, from, horizonte);
    return this.http.get<MacroForecast>(`${this.base}/macro`, { params });
  }

  getMacroSeries(series: string[], from: string, horizonte?: number): Observable<MacroForecast[]> {
    const normalized = this.normalizeMacroSeries(series);
    if (!normalized.length) {
      return of([]);
    }

    const params = this.buildMacroParams(normalized, from, horizonte);
    return this.http
      .get<MacroSeriesResponse | MacroForecast>(`${this.base}/macro`, { params })
      .pipe(
        map((response) => {
          if (response && typeof response === 'object' && !Array.isArray(response)) {
            const multi = response as MacroSeriesResponse;
            if (Array.isArray(multi.series)) {
              return multi.series.filter((item): item is MacroForecast => !!item);
            }
          }
          if (response && typeof response === 'object') {
            return [response as MacroForecast];
          }
          return [];
        })
      );
  }

  listDecisoes(empresaId?: string, limit?: number): Observable<Decisao[]> {
    let params = new HttpParams();
    if (empresaId) {
      params = params.set('empresaId', empresaId);
    }
    if (typeof limit === 'number' && limit > 0) {
      params = params.set('limit', `${limit}`);
    }

    const options = params.keys().length ? { params } : {};
    return this.http.get<Decisao[]>(`${this.base}/decisoes`, options);
  }

  criarDecisao(empresaId: string): Observable<Decisao> {
    return this.http.post<Decisao>(`${this.base}/decisoes`, { empresaId });
  }

  getImpacto(options?: { limit?: number; janela?: number; refresh?: boolean }): Observable<ImpactoResponse> {
    if (!this.useRealStorytelling) {
      return of(this.buildMockImpacto());
    }

    let params = new HttpParams();
    if (options?.limit && options.limit > 0) {
      params = params.set('limit', `${options.limit}`);
    }
    if (options?.janela && options.janela > 0) {
      params = params.set('janela', `${options.janela}`);
    }
    if (options?.refresh) {
      params = params.set('refresh', 'true');
    }

    const httpOptions = params.keys().length ? { params } : undefined;
    return this.http.get<ImpactoResponse>(`${this.base}/api/impacto`, httpOptions).pipe(
      map((payload) => ({ ...payload, clientes: payload?.clientes ?? [], rede_influencia: payload?.rede_influencia ?? [] }))
    );
  }

  getExplain(clienteId: string): Observable<ExplainResponse> {
    const sanitized = (clienteId ?? '').trim() || '0';
    if (!this.useRealStorytelling) {
      return of(this.buildMockExplain(sanitized));
    }

    return this.http
      .get<ExplainResponse>(`${this.base}/api/explain/${encodeURIComponent(sanitized)}`)
      .pipe(
        catchError((error) => {
          if (error?.status && Number(error.status) >= 500) {
            throw error;
          }
          return of(this.buildMockExplain(sanitized, error?.error));
        })
      );
  }

  getMetrics(refresh = false): Observable<MetricsResponse> {
    if (!this.useRealStorytelling) {
      return of(this.buildMockMetrics());
    }

    const params = refresh ? new HttpParams().set('refresh', 'true') : undefined;
    return this.http.get<MetricsResponse>(`${this.base}/api/metrics`, params ? { params } : undefined).pipe(
      catchError(() => of(this.buildMockMetrics()))
    );
  }

  simularCredito(payload: SimuladorRequest): Observable<SimuladorResponse> {
    const enriched = {
      ...payload,
      usuario: (payload.usuario ?? 'front-web').trim() || 'front-web',
    };
    if (!this.useRealStorytelling) {
      return of(this.buildMockSimulador(enriched));
    }
    return this.http
      .post<SimuladorResponse>(`${this.base}/api/simulador`, enriched)
      .pipe(catchError(() => of(this.buildMockSimulador(enriched))));
  }

  resolveEmpresaId(idOrCnpj: string): Observable<string> {
    const trimmed = idOrCnpj.trim();
    if (!trimmed) {
      return of('');
    }

    const candidates = this.buildCandidates(trimmed);

    return this.getEmpresa(trimmed).pipe(
      map((empresa) => empresa.id ?? trimmed),
      catchError(() =>
        this.getEmpresas().pipe(
          map((lista) => {
            const match = this.findMatchInList(lista ?? [], candidates);
            return match ?? trimmed;
          }),
          catchError(() => this.tryFetchIndividually(candidates, trimmed))
        )
      )
    );
  }

  private buildCandidates(identifier: string): string[] {
    const candidates = new Set<string>();
    const trimmed = identifier.trim();
    if (!trimmed) {
      return [];
    }

    candidates.add(trimmed);
    candidates.add(trimmed.toUpperCase());

    const digits = trimmed.replace(/\D/g, '');
    if (digits) {
      candidates.add(digits);
      if (digits.length >= 14) {
        candidates.add(digits.slice(-14).padStart(14, '0'));
      } else {
        const suffix = digits.slice(-5).padStart(5, '0');
        candidates.add(`CNPJ_${suffix}`);
        candidates.add(digits.padStart(14, '0'));
      }
    }

    return Array.from(candidates.values()).filter(Boolean);
  }

  private findMatchInList(lista: EmpresaSummary[], candidates: string[]): string | undefined {
    if (!lista?.length || !candidates.length) {
      return undefined;
    }

    const candidateIds = new Set(candidates.map((item) => item.toUpperCase()));
    const candidateDigits = new Set(
      candidates
        .map((item) => item.replace(/\D/g, ''))
        .filter((value) => !!value)
    );

    for (const empresa of lista) {
      const id = (empresa.id ?? '').toUpperCase();
      if (id && candidateIds.has(id)) {
        return empresa.id ?? id;
      }

      const cnpjRaw = empresa.cnpj ?? '';
      const cnpjUpper = cnpjRaw.toUpperCase();
      if (cnpjUpper && candidateIds.has(cnpjUpper)) {
        return empresa.id ?? cnpjUpper;
      }

      const cnpjDigits = cnpjRaw.replace(/\D/g, '');
      if (cnpjDigits && candidateDigits.has(cnpjDigits)) {
        return empresa.id ?? cnpjRaw;
      }
    }

    return undefined;
  }

  private tryFetchIndividually(candidates: string[], fallback: string): Observable<string> {
    if (!candidates.length) {
      return of(fallback);
    }

    return from(candidates).pipe(
      concatMap((candidate) =>
        this.getEmpresa(candidate).pipe(
          map((empresa) => empresa.id ?? candidate),
          catchError(() => of<string | null>(null))
        )
      ),
      filter((value): value is string => !!value),
      defaultIfEmpty(fallback),
      take(1)
    );
  }

  private normalizeMacroSeries(series: string[]): string[] {
    const normalized = new Set<string>();
    for (const raw of series ?? []) {
      const trimmed = (raw ?? '').trim().toLowerCase();
      if (trimmed) {
        normalized.add(trimmed);
      }
    }
    return Array.from(normalized.values());
  }

  private buildMacroParams(series: string[], from: string, horizonte?: number): HttpParams {
    let params = new HttpParams();
    for (const serie of series) {
      params = params.append('serie', serie);
    }
    if (from) {
      params = params.set('from', from);
    }
    if (typeof horizonte === 'number' && horizonte > 0) {
      params = params.set('horizonte', `${horizonte}`);
    }
    return params;
  }

  private resolveStorytellingFlag(): boolean {
    if (typeof window === 'undefined') {
      return true;
    }
    const win = window as Window & { __USE_REAL_STORYTELLING__?: boolean };
    if (typeof win.__USE_REAL_STORYTELLING__ === 'boolean') {
      return win.__USE_REAL_STORYTELLING__;
    }
    const setting = localStorage.getItem('useRealStorytelling');
    if (setting === 'false') {
      return false;
    }
    if (setting === 'true') {
      return true;
    }
    return true;
  }

  private buildMockImpacto(): ImpactoResponse {
    const clientes: ImpactoCliente[] = [
      {
        empresa_id: 'CLI-MARIA',
        nome: 'Maria',
        score: 0.92,
        limite_antes: 5000,
        limite_depois: 8000,
        variacao: 3000,
        moeda: 'BRL',
        aprovacao: true,
        modelo: 'rf',
      },
      {
        empresa_id: 'CLI-JOAO',
        nome: 'Joao',
        score: 0.65,
        limite_antes: 3000,
        limite_depois: 3500,
        variacao: 500,
        moeda: 'BRL',
        aprovacao: true,
        modelo: 'rf',
      },
      {
        empresa_id: 'CLI-ANA',
        nome: 'Ana',
        score: 0.48,
        limite_antes: 2000,
        limite_depois: 2600,
        variacao: 600,
        moeda: 'BRL',
        aprovacao: true,
        modelo: 'rf',
      },
    ];
    const rede: RedeInfluencia[] = [
      { cliente: 'Maria', influencia: 0.85 },
      { cliente: 'Joao', influencia: 0.42 },
      { cliente: 'Ana', influencia: 0.33 },
    ];
    return {
      clientes,
      rede_influencia: rede,
      resumo:
        'Modo demonstrativo ativo. Ative a flag de dados reais para consumir o storytelling integrado ao Postgres.',
      metadados: {
        atualizado_em: new Date().toISOString(),
        fonte: 'mock-local',
        amostra: clientes.length,
        janela_dias: 90,
      },
    };
  }

  private buildMockExplain(clienteId: string, rawError?: unknown): ExplainResponse {
    const baseScore = 0.6 + (clienteId.length % 10) * 0.02;
    return {
      id_cliente: clienteId,
      score_modelo: Math.min(0.95, Math.max(0.35, Number(baseScore.toFixed(3)))),
      nivel_risco: 'moderado',
      fatores: {
        vl_fatu: 0.12,
        vl_sldo: 0.08,
        idade: 0.04,
      },
      modelo: 'fallback',
      observacoes: [
        'Explicabilidade em modo fallback. Dados reais indisponiveis para este cliente.',
        rawError && typeof rawError === 'string' ? rawError : 'Ative a flag de dados reais para acessar o SHAP.',
      ].filter(Boolean) as string[],
      metadados: {
        gerado_em: new Date().toISOString(),
        fonte: 'mock-local',
      },
    };
  }

  private buildMockMetrics(): MetricsResponse {
    return {
      classificacao: { AUC: 0.84, F1: 0.76, Recall: 0.78, Precision: 0.74 },
      clusterizacao: { Silhouette: 0.65, Calinski: 380.1 },
      historico_auc: [
        { periodo: '2024-01', auc: 0.81 },
        { periodo: '2024-02', auc: 0.82 },
        { periodo: '2024-03', auc: 0.83 },
      ],
      atualizado_em: new Date().toISOString(),
      fonte: 'mock-local',
      janela_dias: 90,
      drift_psi: 0.01,
    };
  }

  private buildMockSimulador(payload: SimuladorRequest): SimuladorResponse {
    const score = Math.min(0.95, Math.max(0.2, payload.historico * 0.7 + payload.conexoes_rede * 0.01));
    return {
      score: Number(score.toFixed(3)),
      risco: score >= 0.75 ? 'baixo' : score >= 0.55 ? 'medio' : score >= 0.4 ? 'moderado' : 'alto',
      modelo: 'mock-local',
      influencia_rede: Math.min(1, payload.conexoes_rede / 20),
      limite_sugerido: Number((Math.max(payload.renda * 1.1, 3000) * (0.5 + score)).toFixed(2)),
      mensagem: 'Simulador em modo demonstrativo. Ative a flag de dados reais para usar o modelo treinado.',
      metadados: { gerado_em: new Date().toISOString(), fonte: 'mock-local' },
    } as SimuladorResponse;
  }

  private resolveApiBaseUrl(): string {
    const normalize = (url: string): string => url.replace(/\/+$/, '');

    if (typeof window === 'undefined') {
      return 'http://core-api:8080';
    }

    const win = window as Window & { __API_BASE_URL__?: string };
    const fromGlobal = typeof win.__API_BASE_URL__ === 'string' ? win.__API_BASE_URL__.trim() : '';
    if (fromGlobal) {
      return normalize(fromGlobal);
    }

    const { hostname, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
      return 'http://localhost:8080';
    }

    return normalize(`${origin}/api`);
  }
}
