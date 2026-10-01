import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PettyCashFlow } from './petty-cash-flow';

describe('PettyCashFlow', () => {
  let component: PettyCashFlow;
  let fixture: ComponentFixture<PettyCashFlow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PettyCashFlow],
    }).compileComponents();

    fixture = TestBed.createComponent(PettyCashFlow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
