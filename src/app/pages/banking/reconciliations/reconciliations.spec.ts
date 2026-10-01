import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Reconciliations } from './reconciliations';

describe('Reconciliations', () => {
  let component: Reconciliations;
  let fixture: ComponentFixture<Reconciliations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reconciliations],
    }).compileComponents();

    fixture = TestBed.createComponent(Reconciliations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
