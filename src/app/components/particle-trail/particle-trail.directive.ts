import { Directive, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { ParticleTrailService, RegisteredElement } from '../../services/particle-trail.service';

@Directive({
  selector: '[appParticleTrail]',
  standalone: true
})
export class ParticleTrailDirective implements OnInit, OnDestroy {
  private observer!: IntersectionObserver;
  private registryItem: RegisteredElement;

  constructor(private el: ElementRef, private trailService: ParticleTrailService) {
    this.registryItem = {
      el: this.el.nativeElement,
      isVisible: false
    };
  }

  ngOnInit(): void {
    this.trailService.register(this.registryItem);

    this.observer = new IntersectionObserver((entries) => {
      this.registryItem.isVisible = entries[0].isIntersecting;
    }, { threshold: 0 });

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    this.trailService.unregister(this.registryItem);
  }
}