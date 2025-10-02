import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { KpisComponent } from './kpis';

describe('KpisComponent', () => {
  let component: KpisComponent;
  let fixture: ComponentFixture<KpisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpisComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ term: '' }) },
            queryParamMap: of(convertToParamMap({ term: '' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KpisComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
