import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ApiService } from '../../../shared/api';
import { MetricsComponent } from './metrics';

describe('MetricsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MetricsComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            getMetrics: () =>
              of({
                classificacao: { AUC: 0.88, F1: 0.76, Recall: 0.8 },
                clusterizacao: { Silhouette: 0.67 },
                atualizado_em: '2024-05-01T00:00:00Z',
                fonte: 'teste',
                drift_psi: 0.01,
                janela_dias: 120,
              }),
          },
        },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(MetricsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
