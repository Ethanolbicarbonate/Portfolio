import { Routes } from '@angular/router';
import { ProjectsComponent } from './components/projects/projects.component';
import { AboutPage } from './components/about-page/about-page';

export const routes: Routes = [
  { path: '', redirectTo: '/projects', pathMatch: 'full' }, // Default route to projects
  { path: 'projects', component: ProjectsComponent },
  { path: 'about', component: AboutPage },
];