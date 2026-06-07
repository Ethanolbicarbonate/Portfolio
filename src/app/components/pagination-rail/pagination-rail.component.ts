import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination-rail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination-rail.component.html',
  styleUrls: ['./pagination-rail.component.scss'],
})
export class PaginationRailComponent implements OnChanges {
  @Input() totalItems: number = 0;
  @Input() activeIndex: number = -1;
  @Input() isVisible: boolean = false;

  @Output() dotClick = new EventEmitter<number>();

  dotIndices: number[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalItems']) {
      this.dotIndices = Array.from({ length: this.totalItems }, (_, i) => i);
    }
  }

  onDotClick(index: number): void {
    this.dotClick.emit(index);
  }
}
