import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientLoanTransactions } from './client-loan-transactions';

describe('ClientLoanTransactions', () => {
  let component: ClientLoanTransactions;
  let fixture: ComponentFixture<ClientLoanTransactions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientLoanTransactions],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientLoanTransactions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
