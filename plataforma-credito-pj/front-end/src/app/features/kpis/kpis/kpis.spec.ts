import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { KpisComponent } from './kpis';

describe('KpisComponent', () => {
  let component: KpisComponent;
  let fixture: ComponentFixture<KpisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpisComponent, HttpClientTestingModule],
      providers: [provideZoneChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KpisComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
