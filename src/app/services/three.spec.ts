import { TestBed } from '@angular/core/testing';

import { ThreeService } from './three.service';

describe('Three', () => {
  let service: ThreeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThreeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
