import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';

import { CardScoreComponent } from './card-score';

describe('CardScoreComponent', () => {
  let component: CardScoreComponent;
  let fixture: ComponentFixture<CardScoreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardScoreComponent],
      providers: [provideZoneChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardScoreComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
