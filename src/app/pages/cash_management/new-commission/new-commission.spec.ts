import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewCommission } from './new-commission';

describe('NewCommission', () => {
  let component: NewCommission;
  let fixture: ComponentFixture<NewCommission>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewCommission],
    }).compileComponents();

    fixture = TestBed.createComponent(NewCommission);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
