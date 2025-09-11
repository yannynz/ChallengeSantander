import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = 'http://localhost:8080/api/v1';

  constructor(private http: HttpClient) {}

  getEmpresaScore(idOrCnpj: string): Observable<any> {
    return of({
      empresaId: idOrCnpj,
      score: 0.82,
      faixa: 'médio',
      explicacoes: { faturamento_yoy: 0.3, betweenness: 0.2 },
      historico: [12, 18, 22, 35, 28, 40, 42, 50, 55, 61, 70, 76]
    });
    // produção: return this.http.get(`${this.base}/empresas/${idOrCnpj}/score`);
  }

  getEmpresaRede(idOrCnpj: string): Observable<any> {
    return of({
      nodes: [
        { id: 'A', label: 'CNPJ_00001' },
        { id: 'B', label: 'CNPJ_00009' },
        { id: 'C', label: 'CNPJ_00042' },
      ],
      edges: [
        { from: 'A', to: 'B', value: 123456 },
        { from: 'B', to: 'C', value: 45678 },
      ]
    });
    // produção: return this.http.get(`${this.base}/empresas/${idOrCnpj}/rede`);
  }

  getMacro(serie: string, from: string): Observable<any> {
    return this.http.get(`${this.base}/macro`, { params: { serie, from }});
  }
}
