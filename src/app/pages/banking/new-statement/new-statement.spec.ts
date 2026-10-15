import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewStatement } from './new-statement';

describe('NewStatement', () => {
  let component: NewStatement;
  let fixture: ComponentFixture<NewStatement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewStatement],
    }).compileComponents();

    fixture = TestBed.createComponent(NewStatement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
