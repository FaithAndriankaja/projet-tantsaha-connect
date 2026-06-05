import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckoutPayment } from './checkout-payment';

describe('CheckoutPayment', () => {
  let component: CheckoutPayment;
  let fixture: ComponentFixture<CheckoutPayment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutPayment],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutPayment);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
