import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Emargement } from './emargement';

describe('Emargement', () => {
  let component: Emargement;
  let fixture: ComponentFixture<Emargement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Emargement],
    }).compileComponents();

    fixture = TestBed.createComponent(Emargement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
