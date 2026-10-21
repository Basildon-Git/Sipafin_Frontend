import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditBranchFloatTransaction } from './edit-branch-float-transaction';

describe('EditBranchFloatTransaction', () => {
  let component: EditBranchFloatTransaction;
  let fixture: ComponentFixture<EditBranchFloatTransaction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditBranchFloatTransaction],
    }).compileComponents();

    fixture = TestBed.createComponent(EditBranchFloatTransaction);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
