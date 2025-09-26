import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';

import { CardMacroComponent } from './card-macro';

describe('CardMacroComponent', () => {
  let component: CardMacroComponent;
  let fixture: ComponentFixture<CardMacroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardMacroComponent],
      providers: [provideZoneChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardMacroComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
