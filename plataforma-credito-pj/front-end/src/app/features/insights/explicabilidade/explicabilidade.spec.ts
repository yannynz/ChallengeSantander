import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ApiService } from '../../../shared/api';
import { ExplicabilidadeComponent } from './explicabilidade';

describe('ExplicabilidadeComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ExplicabilidadeComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            getExplain: () => of({
              id_cliente: 'CLI001',
              score_modelo: 0.8,
              nivel_risco: 'medio',
              fatores: { renda: 0.1 },
              metadados: { gerado_em: '2024-05-01T00:00:00Z' },
            }),
          },
        },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ExplicabilidadeComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
