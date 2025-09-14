import { Component, Input, Output, EventEmitter } from '@angular/core';
import { PaperData } from '../../models/paper-data.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-text-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './text-overlay.html',
  styleUrls: ['./text-overlay.scss']
})
export class TextOverlayComponent { // <-- Changed back to Component
  @Input() focusedPaper: PaperData | null = null;

  // NEW: Event emitter to notify the parent component to show the image
  @Output() viewImage = new EventEmitter<string>();

  /**
   * Called when the "View Image" button is clicked.
   * It emits the URL of the currently focused paper's image.
   */
  public onViewClick(): void {
    if (this.focusedPaper) {
      this.viewImage.emit(this.focusedPaper.imageUrl);
    }
  }
}