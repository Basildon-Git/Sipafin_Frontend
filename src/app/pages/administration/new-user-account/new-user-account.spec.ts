import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewUserAccount } from './new-user-account';

describe('NewUserAccount', () => {
  let component: NewUserAccount;
  let fixture: ComponentFixture<NewUserAccount>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewUserAccount],
    }).compileComponents();

    fixture = TestBed.createComponent(NewUserAccount);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
