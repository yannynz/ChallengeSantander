import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardMacro } from './card-macro';

describe('CardMacro', () => {
  let component: CardMacro;
  let fixture: ComponentFixture<CardMacro>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardMacro]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardMacro);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
