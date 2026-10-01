import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarHire } from './car-hire';

describe('CarHire', () => {
  let component: CarHire;
  let fixture: ComponentFixture<CarHire>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarHire],
    }).compileComponents();

    fixture = TestBed.createComponent(CarHire);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
