import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewLoan } from './new-loan';

describe('NewLoan', () => {
  let component: NewLoan;
  let fixture: ComponentFixture<NewLoan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewLoan],
    }).compileComponents();

    fixture = TestBed.createComponent(NewLoan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
