import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FarmerProfile } from './farmer-profile';

describe('FarmerProfile', () => {
  let component: FarmerProfile;
  let fixture: ComponentFixture<FarmerProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmerProfile],
    }).compileComponents();

    fixture = TestBed.createComponent(FarmerProfile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
