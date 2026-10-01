import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewFinancialTransaction } from './new-financial-transaction';

describe('NewFinancialTransaction', () => {
  let component: NewFinancialTransaction;
  let fixture: ComponentFixture<NewFinancialTransaction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewFinancialTransaction],
    }).compileComponents();

    fixture = TestBed.createComponent(NewFinancialTransaction);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
