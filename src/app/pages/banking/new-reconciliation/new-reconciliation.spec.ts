import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewReconciliation } from './new-reconciliation';

describe('NewReconciliation', () => {
  let component: NewReconciliation;
  let fixture: ComponentFixture<NewReconciliation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewReconciliation],
    }).compileComponents();

    fixture = TestBed.createComponent(NewReconciliation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
