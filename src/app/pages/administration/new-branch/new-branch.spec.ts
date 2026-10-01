import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewBranch } from './new-branch';

describe('NewBranch', () => {
  let component: NewBranch;
  let fixture: ComponentFixture<NewBranch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewBranch],
    }).compileComponents();

    fixture = TestBed.createComponent(NewBranch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
