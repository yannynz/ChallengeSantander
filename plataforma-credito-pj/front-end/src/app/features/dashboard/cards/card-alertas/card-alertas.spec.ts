import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardAlertas } from './card-alertas';

describe('CardAlertas', () => {
  let component: CardAlertas;
  let fixture: ComponentFixture<CardAlertas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardAlertas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardAlertas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
