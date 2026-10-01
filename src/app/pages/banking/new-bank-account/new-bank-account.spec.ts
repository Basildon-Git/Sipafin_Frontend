import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewBankAccount } from './new-bank-account';

describe('NewBankAccount', () => {
  let component: NewBankAccount;
  let fixture: ComponentFixture<NewBankAccount>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewBankAccount],
    }).compileComponents();

    fixture = TestBed.createComponent(NewBankAccount);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
