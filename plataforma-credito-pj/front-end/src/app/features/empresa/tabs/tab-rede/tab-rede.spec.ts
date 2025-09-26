import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { TabRedeComponent } from './tab-rede';

describe('TabRedeComponent', () => {
  let component: TabRedeComponent;
  let fixture: ComponentFixture<TabRedeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabRedeComponent, HttpClientTestingModule],
      providers: [provideZoneChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabRedeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
