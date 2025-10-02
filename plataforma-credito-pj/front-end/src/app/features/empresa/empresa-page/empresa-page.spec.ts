import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { EmpresaPageComponent } from './empresa-page';

describe('EmpresaPageComponent', () => {
  let component: EmpresaPageComponent;
  let fixture: ComponentFixture<EmpresaPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpresaPageComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({})
            },
            paramMap: of(convertToParamMap({})),
            queryParamMap: of(convertToParamMap({}))
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpresaPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
