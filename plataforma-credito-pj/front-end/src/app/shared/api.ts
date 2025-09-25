import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

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

    return this.getEmpresa(trimmed).pipe(
      map((empresa) => empresa.id ?? trimmed),
      catchError(() =>
        this.getEmpresas().pipe(
          map((lista) => {
            const match = lista.find((item) => item.id === trimmed || item.cnpj === trimmed);
            return match?.id ?? trimmed;
          }),
          catchError(() => of(trimmed))
        )
      )
    );
  }
}
