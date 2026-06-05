import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarketplaceMobile } from './marketplace-mobile';

describe('MarketplaceMobile', () => {
  let component: MarketplaceMobile;
  let fixture: ComponentFixture<MarketplaceMobile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketplaceMobile],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketplaceMobile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
