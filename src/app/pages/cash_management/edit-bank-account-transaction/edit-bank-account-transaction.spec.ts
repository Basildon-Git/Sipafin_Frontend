import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditBankAccountTransaction } from './edit-bank-account-transaction';

describe('EditBankAccountTransaction', () => {
  let component: EditBankAccountTransaction;
  let fixture: ComponentFixture<EditBankAccountTransaction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditBankAccountTransaction],
    }).compileComponents();

    fixture = TestBed.createComponent(EditBankAccountTransaction);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
