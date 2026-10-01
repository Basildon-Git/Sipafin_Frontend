import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewClientLoan } from './new-client-loan';

describe('NewClientLoan', () => {
  let component: NewClientLoan;
  let fixture: ComponentFixture<NewClientLoan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewClientLoan],
    }).compileComponents();

    fixture = TestBed.createComponent(NewClientLoan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
