import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewInvestor } from './new-investor';

describe('NewInvestor', () => {
  let component: NewInvestor;
  let fixture: ComponentFixture<NewInvestor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewInvestor],
    }).compileComponents();

    fixture = TestBed.createComponent(NewInvestor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
