import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientLoans } from './client-loans';

describe('ClientLoans', () => {
  let component: ClientLoans;
  let fixture: ComponentFixture<ClientLoans>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientLoans],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientLoans);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
