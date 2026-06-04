// File: src/app/components/text-overlay/text-overlay.ts
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import TIMEOUTS from '../../utils/timeouts';
import { PaperData } from '../../models/paper-data.model';

@Component({
  selector: 'app-text-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './text-overlay.html',
  styleUrls: ['./text-overlay.scss']
})
export class TextOverlayComponent implements OnChanges {
  @Input() focusedPaper: PaperData | null = null;
  @Output() viewImage = new EventEmitter<string>();

  public displayPaper: PaperData | null = null;
  public isTransitioning = false; // Controls the card's blur/fade
  public animateContent = false;  // Controls the text stagger

  private transitionTimeout: any;
  private animTimeout: any;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['focusedPaper']) {
      // Clear any ongoing timeouts to prevent fast-scrolling glitches
      clearTimeout(this.transitionTimeout);
      clearTimeout(this.animTimeout);

      const prev = changes['focusedPaper'].previousValue;
      const curr = changes['focusedPaper'].currentValue;

      // If switching directly from one illustration to another
      if (prev && curr && prev.id !== curr.id) {
        this.isTransitioning = true; // Trigger whole card blur & fade out
        this.animateContent = false; // Reset text animation

        // Wait a short transition duration before swapping data
        this.transitionTimeout = setTimeout(() => {
          this.displayPaper = curr;
          this.isTransitioning = false; // Trigger card blur & fade in

          // Tiny delay to let DOM register the swap before staggering text
          this.animTimeout = setTimeout(() => {
            this.animateContent = true;
          }, TIMEOUTS.textOverlay.contentDelay);
        }, TIMEOUTS.textOverlay.transition);
      } 
      // If opening from the main overview or closing entirely
      else {
        this.displayPaper = curr;
        if (curr) {
          this.isTransitioning = false;
          this.animTimeout = setTimeout(() => {
            this.animateContent = true;
          }, TIMEOUTS.textOverlay.openDelay);
        } else {
          this.animateContent = false;
        }
      }
    }
  }

  public onViewClick(): void {
    if (this.displayPaper) {
      this.viewImage.emit(this.displayPaper.imageUrl);
    }
  }
}