import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CashFloats } from './cash-floats';

describe('CashFloats', () => {
  let component: CashFloats;
  let fixture: ComponentFixture<CashFloats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CashFloats],
    }).compileComponents();

    fixture = TestBed.createComponent(CashFloats);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
