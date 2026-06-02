// File: src/app/app.routes.ts
import { Routes } from '@angular/router';
import { IllustrationsComponent } from './components/illustrations/illustrations.component';
import { AboutPage } from './components/about-page/about-page';

export const routes: Routes = [
  { path: '', redirectTo: '/illustrations', pathMatch: 'full' },
  { path: 'illustrations', component: IllustrationsComponent, data: { animation: 'IllustrationsPage' } },
  { path: 'about', component: AboutPage, data: { animation: 'AboutPage' } },
];