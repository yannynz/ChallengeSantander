import 'zone.js';
import 'zone.js/testing';
import { getTestBed, TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ChartComponent } from 'ng-apexcharts';

import { ApiService, Decisao, EmpresaRedeResponse, EmpresaScoreResponse, MacroForecast } from './app/shared/api';

declare const beforeEach:
  | ((fn: () => void | Promise<void>) => void)
  | undefined;

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting(), {
  teardown: { destroyAfterEach: true },
});

const apiServiceStub: Partial<ApiService> = {
  getEmpresas: () => of([]),
  getEmpresa: () => of({ id: 'CNPJ_00001' }),
  getEmpresaScore: () => of({ score: 0 } as EmpresaScoreResponse),
  getEmpresaRede: () => of({ nodes: [], edges: [] } as EmpresaRedeResponse),
  getMacro: () =>
    of({
      serie: [],
      forecast: [],
      historicoTimestamps: [],
      forecastTimestamps: [],
      fonte: 'Stub Fonte',
      serieId: 'selic',
      descricao: 'Stub Selic',
      ultimaAtualizacao: new Date().toISOString().slice(0, 10),
    } as MacroForecast),
  getMacroSeries: () =>
    of([
      {
        serie: [],
        forecast: [],
        historicoTimestamps: [],
        forecastTimestamps: [],
        fonte: 'Stub Fonte',
        serieId: 'selic',
        descricao: 'Stub Selic',
        ultimaAtualizacao: new Date().toISOString().slice(0, 10),
      } as MacroForecast,
    ]),
  listDecisoes: () => of<Decisao[]>([]),
  criarDecisao: (empresaId: string) => of({
    id: '1',
    empresaId,
    dtDecisao: new Date().toISOString(),
    aprovacao: true,
    score: 0,
    limite: 0,
    moeda: 'BRL',
    motivo: 'stub',
    decisao: 'APROVADO',
  }),
  resolveEmpresaId: () => of('CNPJ_00001'),
};

if (typeof beforeEach === 'function') {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    TestBed.overrideProvider(ApiService, { useValue: apiServiceStub });
  });
}

ChartComponent.prototype.render = function render() {
  return Promise.resolve();
};
