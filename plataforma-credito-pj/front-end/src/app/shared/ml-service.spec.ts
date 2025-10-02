import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { MlService } from './ml-service';

describe('MlService', () => {
  let service: MlService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(MlService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
