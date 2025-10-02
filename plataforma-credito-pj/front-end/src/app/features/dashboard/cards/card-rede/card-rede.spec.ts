import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';

import { CardRedeComponent } from './card-rede';

describe('CardRedeComponent', () => {
  let component: CardRedeComponent;
  let fixture: ComponentFixture<CardRedeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardRedeComponent],
      providers: [provideZoneChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardRedeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
