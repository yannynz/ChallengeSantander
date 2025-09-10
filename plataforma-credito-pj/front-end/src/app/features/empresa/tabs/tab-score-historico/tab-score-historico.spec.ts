import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabScoreHistorico } from './tab-score-historico';

describe('TabScoreHistorico', () => {
  let component: TabScoreHistorico;
  let fixture: ComponentFixture<TabScoreHistorico>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabScoreHistorico]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabScoreHistorico);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
