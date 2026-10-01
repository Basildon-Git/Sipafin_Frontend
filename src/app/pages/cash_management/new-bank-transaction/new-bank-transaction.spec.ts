import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewBankTransaction } from './new-bank-transaction';

describe('NewBankTransaction', () => {
  let component: NewBankTransaction;
  let fixture: ComponentFixture<NewBankTransaction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewBankTransaction],
    }).compileComponents();

    fixture = TestBed.createComponent(NewBankTransaction);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
