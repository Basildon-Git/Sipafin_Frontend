import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PettyCashBranchAccounts } from './petty-cash-branch-accounts';

describe('PettyCashBranchAccounts', () => {
  let component: PettyCashBranchAccounts;
  let fixture: ComponentFixture<PettyCashBranchAccounts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PettyCashBranchAccounts],
    }).compileComponents();

    fixture = TestBed.createComponent(PettyCashBranchAccounts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
