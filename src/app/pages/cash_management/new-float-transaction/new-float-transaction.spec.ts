import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewFloatTransaction } from './new-float-transaction';

describe('NewFloatTransaction', () => {
  let component: NewFloatTransaction;
  let fixture: ComponentFixture<NewFloatTransaction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewFloatTransaction],
    }).compileComponents();

    fixture = TestBed.createComponent(NewFloatTransaction);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
