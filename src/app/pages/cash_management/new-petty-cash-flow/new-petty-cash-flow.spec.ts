import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewPettyCashFlow } from './new-petty-cash-flow';

describe('NewPettyCashFlow', () => {
  let component: NewPettyCashFlow;
  let fixture: ComponentFixture<NewPettyCashFlow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewPettyCashFlow],
    }).compileComponents();

    fixture = TestBed.createComponent(NewPettyCashFlow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
