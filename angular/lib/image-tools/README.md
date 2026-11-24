# image-tools

Two tools for looking closely at a picture, for any Angular + Material app:

- **`ui-clahe-toggle`** — a toolbar toggle for local contrast (CLAHE). The host keeps the on/off state and draws the
  enhanced copy from `claheCanvas(source)` when it is on.
- **`ui-lens`** — a magnifier that follows the pointer, showing the picture under it at a chosen zoom.

```html
<div class="view" style="position: relative">
  <canvas #canvas></canvas>                                    <!-- your picture and pointer handling -->
  @if (lensOn()) {
    <ui-lens [source]="shown()" [view]="view()" [pointer]="pointer()" [zoom]="3" [size]="180" />
  }
</div>
<ui-clahe-toggle [(pressed)]="claheOn" />
```

```ts
const shown = computed(() => (claheOn() ? claheCanvas(image) : image));   // image: ImageBitmap | HTMLImageElement
```

## Behaviour
- The lens is a square with rounded corners, `size` pixels on a side. It shows the picture at `zoom` times the view's scale, centred on the
  pointer, with a small cross at the pointer.
- It sits to the right of the pointer. Near the picture's right border it moves to the left; near the top or bottom
  it moves below or above. Near a corner it slides along the border. It never covers the pointer.
- It is hidden when the pointer is off the picture (`pointer` null, or outside the picture's on-screen rectangle).
- `claheCanvas` runs CLAHE once per source and options and caches the result, so switching it on and off is cheap after the
  first time. It runs on the main thread.

## API
- `ui-clahe-toggle`: `pressed` (model, boolean), `label`, `tooltip`.
- `ui-lens`: `source` (CanvasImageSource), `view` (`LensView`: `tx`, `ty`, `scale`, `imageWidth`, `imageHeight`,
  `viewWidth`, `viewHeight`), `pointer` (`{x, y}` in view pixels), `zoom` (default 3), `size` (default 180).
- `claheCanvas(source, { tiles = 8, clip = 2 })`: the enhanced picture as a canvas.
- Pure maths, from `@web-ui-kit/core/image`: `clahe`, `placeLens`, `lensSource`.
