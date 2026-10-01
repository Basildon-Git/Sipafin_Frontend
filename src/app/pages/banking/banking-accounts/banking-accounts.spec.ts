import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankingAccounts } from './banking-accounts';

describe('BankingAccounts', () => {
  let component: BankingAccounts;
  let fixture: ComponentFixture<BankingAccounts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankingAccounts],
    }).compileComponents();

    fixture = TestBed.createComponent(BankingAccounts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
