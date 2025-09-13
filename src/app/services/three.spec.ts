import { TestBed } from '@angular/core/testing';

import { Three } from './three';

describe('Three', () => {
  let service: Three;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Three);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
