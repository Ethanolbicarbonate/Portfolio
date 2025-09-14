// File: .\app\components\about-page\about-page.ts
import { Component, OnInit, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-page.html',
  styleUrl: './about-page.scss'
})
export class AboutPage implements OnInit, OnDestroy {
  
  private animationObserver?: IntersectionObserver;
  private skillAnimationTimeouts: number[] = [];

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    // Add entrance animation class to body to prevent scroll during animation
    document.body.style.overflow = 'hidden';
    
    // Initialize component
    this.setupAnimationObserver();
    this.initializeSkillAnimations();
    this.setupFloatingDots();
    
    // Restore scroll after initial animations
    setTimeout(() => {
      document.body.style.overflow = 'auto';
    }, 1500);
  }

  ngOnDestroy(): void {
    // Cleanup
    document.body.style.overflow = 'auto';
    
    if (this.animationObserver) {
      this.animationObserver.disconnect();
    }
    
    // Clear all timeouts
    this.skillAnimationTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  // Enhanced social link handler with more platforms
  onSocialClick(platform: string): void {
    console.log(`Opening ${platform} link`);
    
    // You can replace these with your actual contact information
    switch (platform) {
      case 'email':
        window.open('mailto:ethanjed.carbonell@wvsu.edu.ph?subject=Portfolio Inquiry', '_blank');
        break;
      case 'instagram':
        window.open('https://instagram.com/ethanjedii', '_blank');
        break;
      case 'github':
        window.open('https://github.com/Ethanolbicarbonate', '_blank');
        break;
      case 'linkedin':
        window.open('https://linkedin.com/in/ethan-jed-carbonell-2766ab384', '_blank');
        break;
      case 'twitter':
        window.open('https://twitter.com/ethanjed', '_blank');
        break;
      case 'artstation':
        window.open('https://artstation.com/ethanjed', '_blank');
        break;
      case 'behance':
        window.open('https://behance.net/ethanjed', '_blank');
        break;
      default:
        console.warn(`Unknown platform: ${platform}`);
        break;
    }
  }

  // Initialize skill capsule hover animations
  private initializeSkillAnimations(): void {
    setTimeout(() => {
      const skillCapsules = this.elementRef.nativeElement.querySelectorAll('.skill-capsule');
      
      skillCapsules.forEach((capsule: HTMLElement, index: number) => {
        const timeout = setTimeout(() => {
          capsule.style.transform = 'scale(1.05)';
          setTimeout(() => {
            capsule.style.transform = 'scale(1)';
          }, 200);
        }, index * 100 + 2000); // Start after 2 seconds, stagger by 100ms
        
        this.skillAnimationTimeouts.push(timeout);
      });
    }, 100);
  }

  // Setup floating dots animation
  private setupFloatingDots(): void {
    setTimeout(() => {
      const dots = this.elementRef.nativeElement.querySelectorAll('.floating-dot');
      
      dots.forEach((dot: HTMLElement) => {
        // Add random glow effect
        const glowTimeout = setTimeout(() => {
          dot.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.6)';
          setTimeout(() => {
            dot.style.boxShadow = '';
          }, 1000);
        }, Math.random() * 5000 + 2000);
        
        this.skillAnimationTimeouts.push(glowTimeout);
      });
    }, 3000);
  }

  // Enhanced intersection observer for scroll-triggered animations
  private setupAnimationObserver(): void {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.animationObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('animate-in');
              
              // Add special effects for different card types
              if (entry.target.classList.contains('content-card')) {
                this.animateCard(entry.target as HTMLElement);
              }
              
              if (entry.target.classList.contains('skill-category')) {
                this.animateSkillCategory(entry.target as HTMLElement);
              }
            }
          });
        },
        {
          threshold: 0.15,
          rootMargin: '0px 0px -80px 0px'
        }
      );

      // Observe elements after a short delay to ensure DOM is ready
      setTimeout(() => {
        const observeElements = this.elementRef.nativeElement.querySelectorAll(
          '.content-card, .skill-category, .contact-card'
        );
        observeElements.forEach((el: HTMLElement) => this.animationObserver?.observe(el));
      }, 200);
    }
  }

  // Animate individual cards with enhanced effects
  private animateCard(card: HTMLElement): void {
    const icon = card.querySelector('.card-icon') as HTMLElement;
    
    if (icon) {
      setTimeout(() => {
        icon.style.transform = 'scale(1.1) rotate(5deg)';
        setTimeout(() => {
          icon.style.transform = 'scale(1) rotate(0deg)';
        }, 300);
      }, 200);
    }
  }

  // Animate skill categories with staggered capsule animations
  private animateSkillCategory(category: HTMLElement): void {
    const capsules = category.querySelectorAll('.skill-capsule');
    
    capsules.forEach((element: Element, index: number) => {
      const capsule = element as HTMLElement;
      const timeout = setTimeout(() => {
        capsule.style.transform = 'translateY(-3px) scale(1.02)';
        capsule.style.boxShadow = '0 5px 15px rgba(255, 255, 255, 0.1)';
        
        setTimeout(() => {
          capsule.style.transform = 'translateY(0) scale(1)';
          capsule.style.boxShadow = '';
        }, 400);
      }, index * 80);
      
      this.skillAnimationTimeouts.push(timeout);
    });
  }

  // Method to handle skill capsule clicks (optional feature)
  onSkillClick(skillName: string, category: 'art' | 'dev'): void {
    console.log(`Clicked ${category} skill: ${skillName}`);
    
    // You could implement features like:
    // - Show skill details in a modal
    // - Filter portfolio items by skill
    // - Navigate to projects using this skill
    
    // Example: Show skill proficiency or related projects
    this.showSkillDetails(skillName, category);
  }

  // Show skill details (placeholder for future enhancement)
  private showSkillDetails(skillName: string, category: 'art' | 'dev'): void {
    // This could open a modal, tooltip, or navigate to related content
    console.log(`Showing details for ${skillName} in ${category} category`);
    
    // You might want to emit an event or update a service here
    // to show skill-related portfolio items or experience details
  }

  // Method to handle card hover effects programmatically
  onCardHover(event: MouseEvent, entering: boolean): void {
    const card = event.currentTarget as HTMLElement;
    const icon = card.querySelector('.card-icon') as HTMLElement;
    
    if (entering) {
      if (icon) {
        icon.style.transform = 'scale(1.05)';
      }
    } else {
      if (icon) {
        icon.style.transform = 'scale(1)';
      }
    }
  }

  // Utility method to handle smooth scrolling (if needed for navigation)
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }
}