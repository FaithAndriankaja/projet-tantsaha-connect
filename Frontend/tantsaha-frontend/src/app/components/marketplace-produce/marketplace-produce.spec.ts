import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarketplaceProduce } from './marketplace-produce';

describe('MarketplaceProduce', () => {
  let component: MarketplaceProduce;
  let fixture: ComponentFixture<MarketplaceProduce>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketplaceProduce],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketplaceProduce);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
