// File: .\app\components\about-page\about-page.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [CommonModule], // Add CommonModule here
  templateUrl: './about-page.html',
  styleUrl: './about-page.scss'
})
export class AboutPage {

}