import { InjectionToken } from '@angular/core';
import { DewarpRendererFactory, createDewarpRenderer } from '@ui-kit/core/dewarp';

/** Makes the renderer of a DewarpViewer; tests give a fake one (jsdom and headless browsers may lack WebGL 2). */
export const DEWARP_RENDERER_FACTORY = new InjectionToken<DewarpRendererFactory>('DEWARP_RENDERER_FACTORY', {
  providedIn: 'root',
  factory: () => createDewarpRenderer,
});
