import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService, EmpresaScoreResponse, MacroForecast } from './api';

@Injectable({providedIn:'root'})
export class MlService {
  private readonly api = inject(ApiService);

  score(input: { empresaId: string } | string): Observable<EmpresaScoreResponse> {
    const empresaId = typeof input === 'string' ? input : input.empresaId;
    return this.api.getEmpresaScore(empresaId);
  }

  forecastArima(serie: string, horizonte: number, from?: string): Observable<MacroForecast> {
    const reference = from ?? new Date().toISOString().slice(0, 10);
    return this.api.getMacro(serie, reference, horizonte);
  }
}
