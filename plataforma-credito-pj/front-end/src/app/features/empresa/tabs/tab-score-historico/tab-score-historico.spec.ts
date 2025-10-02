import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { TabScoreHistoricoComponent } from './tab-score-historico';

describe('TabScoreHistoricoComponent', () => {
  let component: TabScoreHistoricoComponent;
  let fixture: ComponentFixture<TabScoreHistoricoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabScoreHistoricoComponent, HttpClientTestingModule],
      providers: [provideZoneChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabScoreHistoricoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
