import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { TabDecisoesComponent } from './tab-decisoes';

describe('TabDecisoesComponent', () => {
  let component: TabDecisoesComponent;
  let fixture: ComponentFixture<TabDecisoesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabDecisoesComponent, HttpClientTestingModule],
      providers: [provideZoneChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabDecisoesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
