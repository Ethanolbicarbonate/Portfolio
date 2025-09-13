import { Component, Input } from '@angular/core';
import { PaperData } from '../../models/paper-data.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-text-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './text-overlay.html',
  styleUrls: ['./text-overlay.scss']
})
export class TextOverlay {
  @Input() focusedPaper: PaperData | null = null;
}