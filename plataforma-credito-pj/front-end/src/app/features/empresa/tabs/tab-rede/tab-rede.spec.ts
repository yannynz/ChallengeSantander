import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabRede } from './tab-rede';

describe('TabRede', () => {
  let component: TabRede;
  let fixture: ComponentFixture<TabRede>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabRede]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabRede);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
