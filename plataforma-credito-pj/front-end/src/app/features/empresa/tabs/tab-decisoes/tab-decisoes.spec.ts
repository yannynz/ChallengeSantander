import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabDecisoes } from './tab-decisoes';

describe('TabDecisoes', () => {
  let component: TabDecisoes;
  let fixture: ComponentFixture<TabDecisoes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabDecisoes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabDecisoes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
