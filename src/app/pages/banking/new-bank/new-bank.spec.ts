import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewBank } from './new-bank';

describe('NewBank', () => {
  let component: NewBank;
  let fixture: ComponentFixture<NewBank>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewBank],
    }).compileComponents();

    fixture = TestBed.createComponent(NewBank);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
