import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { ApiService } from './api';

describe('ApiService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('useRealStorytelling');
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    const service = TestBed.inject(ApiService);
    expect(service).toBeTruthy();
  });

  it('should short-circuit storytelling requests when flag is disabled', () => {
    localStorage.setItem('useRealStorytelling', 'false');
    const disabledService = TestBed.inject(ApiService);

    disabledService.getImpacto().subscribe((payload) => {
      expect(payload.metadados?.fonte).toBe('mock-local');
    });

    disabledService.getExplain('CLI001').subscribe((payload) => {
      expect(payload.modelo).toBe('fallback');
    });

    disabledService.getMetrics().subscribe((payload) => {
      expect(payload.fonte).toBe('mock-local');
    });

    disabledService.simularCredito({ renda: 1000, idade: 30, historico: 0.5, conexoes_rede: 2 }).subscribe((payload) => {
      expect(payload.modelo).toBe('mock-local');
    });

    httpMock.expectNone((req) => req.url.includes('/api/'));
  });

  afterEach(() => {
    httpMock.verify({ ignoreCancelled: true });
  });
});
