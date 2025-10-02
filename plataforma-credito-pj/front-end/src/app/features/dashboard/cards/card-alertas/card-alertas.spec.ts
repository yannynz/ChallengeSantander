import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';

import { CardAlertasComponent } from './card-alertas';

describe('CardAlertasComponent', () => {
  let component: CardAlertasComponent;
  let fixture: ComponentFixture<CardAlertasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardAlertasComponent],
      providers: [provideZoneChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardAlertasComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
