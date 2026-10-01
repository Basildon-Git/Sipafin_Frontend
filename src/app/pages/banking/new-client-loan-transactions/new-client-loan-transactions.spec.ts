import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewClientLoanTransactions } from './new-client-loan-transactions';

describe('NewClientLoanTransactions', () => {
  let component: NewClientLoanTransactions;
  let fixture: ComponentFixture<NewClientLoanTransactions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewClientLoanTransactions],
    }).compileComponents();

    fixture = TestBed.createComponent(NewClientLoanTransactions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
