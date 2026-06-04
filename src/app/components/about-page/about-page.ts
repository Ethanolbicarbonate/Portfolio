// File: src/app/components/about-page/about-page.ts
import { Component, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import TIMEOUTS from '../../utils/timeouts';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-page.html',
  styleUrl: './about-page.scss'
})
export class AboutPage implements OnInit, OnDestroy {
  
  private animationObserver?: IntersectionObserver;

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    // Prevent background scrolling while entering
    document.body.style.overflow = 'hidden';
    
    this.setupAnimationObserver();
    
    // Restore scroll after initial hero animations complete
    setTimeout(() => {
      document.body.style.overflow = 'auto';
    }, TIMEOUTS.INITIAL_ANIMATION);
  }

  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
    
    if (this.animationObserver) {
      this.animationObserver.disconnect();
    }
  }

  // Handle external links creatively
  onSocialClick(platform: string): void {
    switch (platform) {
      case 'email':
        window.open('mailto:ethanjed.carbonell@wvsu.edu.ph?subject=Portfolio Inquiry', '_blank');
        break;
      case 'instagram':
        window.open('https://instagram.com/ethanjedii', '_blank');
        break;
      case 'artstation':
        window.open('https://artstation.com/ethanjed', '_blank');
        break;
      default:
        console.warn(`Unknown platform: ${platform}`);
        break;
    }
  }

  // Intersection observer for scrolling the bento cards smoothly into view
  private setupAnimationObserver(): void {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.animationObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              // Add a slight delay based on the DOM structure for a staggered effect
              const target = entry.target as HTMLElement;
              target.classList.add('animate-in');
              
              // Once animated in, we can stop observing it
              this.animationObserver?.unobserve(target);
            }
          });
        },
        {
          threshold: 0.1, // Trigger when 10% visible
          rootMargin: '0px 0px -50px 0px' // Slightly trigger before it reaches the bottom
        }
      );

      // Start observing after a tick
      setTimeout(() => {
        const observeElements = this.elementRef.nativeElement.querySelectorAll('.observe-me');
        observeElements.forEach((el: HTMLElement) => this.animationObserver?.observe(el));
      }, 100);
    }
  }
}