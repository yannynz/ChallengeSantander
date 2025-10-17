import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ApiService } from '../../../shared/api';
import { SimuladorComponent } from './simulador';

describe('SimuladorComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SimuladorComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            simularCredito: () =>
              of({
                score: 0.8,
                risco: 'medio',
                influencia_rede: 0.6,
                limite_sugerido: 5000,
                mensagem: 'ok',
                modelo: 'rf',
                metadados: { gerado_em: '2024-05-01T00:00:00Z' },
              }),
          },
        },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SimuladorComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
