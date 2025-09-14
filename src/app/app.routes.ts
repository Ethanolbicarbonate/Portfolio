// File: .\app\app.routes.ts
import { Routes } from '@angular/router';
import { ProjectsComponent } from './components/projects/projects.component';
import { AboutPage } from './components/about-page/about-page';

export const routes: Routes = [
  { path: '', redirectTo: '/projects', pathMatch: 'full' },
  { path: 'projects', component: ProjectsComponent, data: { animation: 'ProjectsPage' } }, // Add animation data
  { path: 'about', component: AboutPage, data: { animation: 'AboutPage' } }, // Add animation data
];