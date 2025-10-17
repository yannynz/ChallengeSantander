import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ApiService } from '../../../shared/api';
import { ImpactoComponent } from './impacto';

describe('ImpactoComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ImpactoComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            getImpacto: () =>
              of({
                clientes: [{ nome: 'Maria', empresa_id: 'CLI-MARIA', score: 0.9, limite_antes: 1000, limite_depois: 2000 }],
                rede_influencia: [],
                metadados: { atualizado_em: '2024-05-01T00:00:00Z', fonte: 'teste' },
              }),
          },
        },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ImpactoComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
