import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewLoanTransaction } from './new-loan-transaction';

describe('NewLoanTransaction', () => {
  let component: NewLoanTransaction;
  let fixture: ComponentFixture<NewLoanTransaction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewLoanTransaction],
    }).compileComponents();

    fixture = TestBed.createComponent(NewLoanTransaction);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
