import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankTransactions } from './bank-transactions';

describe('BankTransactions', () => {
  let component: BankTransactions;
  let fixture: ComponentFixture<BankTransactions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankTransactions],
    }).compileComponents();

    fixture = TestBed.createComponent(BankTransactions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
