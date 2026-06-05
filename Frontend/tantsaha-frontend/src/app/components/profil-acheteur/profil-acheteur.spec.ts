import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilAcheteur } from './profil-acheteur';

describe('ProfilAcheteur', () => {
  let component: ProfilAcheteur;
  let fixture: ComponentFixture<ProfilAcheteur>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilAcheteur],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilAcheteur);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
