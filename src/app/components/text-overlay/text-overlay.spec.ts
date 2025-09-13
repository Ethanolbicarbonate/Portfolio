import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextOverlay } from './text-overlay';

describe('TextOverlay', () => {
  let component: TextOverlay;
  let fixture: ComponentFixture<TextOverlay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextOverlay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextOverlay);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
