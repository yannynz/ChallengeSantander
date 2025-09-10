import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardScore } from './card-score';

describe('CardScore', () => {
  let component: CardScore;
  let fixture: ComponentFixture<CardScore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardScore]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardScore);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
