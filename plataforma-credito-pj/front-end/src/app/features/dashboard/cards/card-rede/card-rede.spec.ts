import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardRede } from './card-rede';

describe('CardRede', () => {
  let component: CardRede;
  let fixture: ComponentFixture<CardRede>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardRede]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardRede);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
