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

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:8080';

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

  getMacro(serie: string, from: string): Observable<MacroForecast> {
    const params = new HttpParams().set('serie', serie).set('from', from);
    return this.http.get<MacroForecast>(`${this.base}/macro`, { params });
  }

  listDecisoes(): Observable<Decisao[]> {
    return this.http.get<Decisao[]>(`${this.base}/decisoes`);
  }

  criarDecisao(empresaId: string): Observable<Decisao> {
    return this.http.post<Decisao>(`${this.base}/decisoes`, { empresaId });
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
}
