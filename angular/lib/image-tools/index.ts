// Copyright (c) 2026 Philipp Orlov

export { ClaheToggleComponent } from './clahe-toggle.component';
export { LensComponent, type LensView } from './lens.component';
export { claheCanvas, type PictureSource } from './clahe-canvas';
// The pure maths (CLAHE, lens placement) is @web-ui-kit/core/image's; re-exported for one import.
export { clahe, lensSource, placeLens, type ClaheOptions, type LensPlacement, type LensSide, type PixelBuffer } from '@web-ui-kit/core/image';
