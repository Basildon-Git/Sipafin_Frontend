import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BranchFloatTransactions } from './branch-float-transactions';

describe('BranchFloatTransactions', () => {
  let component: BranchFloatTransactions;
  let fixture: ComponentFixture<BranchFloatTransactions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BranchFloatTransactions],
    }).compileComponents();

    fixture = TestBed.createComponent(BranchFloatTransactions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
