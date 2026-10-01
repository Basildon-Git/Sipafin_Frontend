import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewPettyCashBranchAccount } from './new-petty-cash-branch-account';

describe('NewPettyCashBranchAccount', () => {
  let component: NewPettyCashBranchAccount;
  let fixture: ComponentFixture<NewPettyCashBranchAccount>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewPettyCashBranchAccount],
    }).compileComponents();

    fixture = TestBed.createComponent(NewPettyCashBranchAccount);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
