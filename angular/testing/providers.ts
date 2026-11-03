// Every spec runs zoneless, as the apps do.
import { provideZonelessChangeDetection } from '@angular/core';

export default [provideZonelessChangeDetection()];
