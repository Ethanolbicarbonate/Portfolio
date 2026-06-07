import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-preview.component.html',
  styleUrls: ['./image-preview.component.scss'],
})
export class ImagePreviewComponent {
  @Input() imageUrl: string | null = null;
  @Input() isVisible: boolean = false;

  // Emit an event to tell the parent to close the preview
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}
