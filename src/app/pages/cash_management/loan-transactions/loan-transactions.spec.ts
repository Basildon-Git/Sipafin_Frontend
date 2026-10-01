import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanTransactions } from './loan-transactions';

describe('LoanTransactions', () => {
  let component: LoanTransactions;
  let fixture: ComponentFixture<LoanTransactions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanTransactions],
    }).compileComponents();

    fixture = TestBed.createComponent(LoanTransactions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
