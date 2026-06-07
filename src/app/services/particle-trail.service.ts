import { Injectable } from '@angular/core';

export interface RegisteredElement {
  el: HTMLElement;
  isVisible: boolean;
}

@Injectable({ providedIn: 'root' })
export class ParticleTrailService {
  private elements = new Set<RegisteredElement>();

  register(element: RegisteredElement): void {
    this.elements.add(element);
  }

  unregister(element: RegisteredElement): void {
    this.elements.delete(element);
  }

  getVisibleElements(): HTMLElement[] {
    const visible: HTMLElement[] = [];
    this.elements.forEach(item => {
      if (item.isVisible) visible.push(item.el);
    });
    return visible;
  }
}