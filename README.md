# web-ui-kit

Shared UI building blocks for libsql's sql tool, gscope and dewarp-viewer, in two layers:

| Package | Folder | What it holds |
| --- | --- | --- |
| `@ui-kit/core` | [core/](core/) | Everything that is not rendering, in plain TypeScript with no framework: grid filtering, sorting and grouping; sparkline and report chart drawing; PDF (with TrueType subsetting), SVG, XLSX, CSV and ZIP writers; number, date and size formatting; theme persistence; hex-dump layout; split-pane sizing; the fisheye dewarping engine (lens models, view maths, WebGL 2 renderer). |
| `@ui-kit/angular` | [angular/](angular/) | Angular 22 + Material 3 components on top of core: `ui-data-grid`, `ui-split` / `ui-split-pane`, `ui-sparkline-chart`, `ui-select` / `ui-combo` / `ui-date` / `ui-text` / `ui-json-editor`, `ui-theme-toggle`, `ui-hex-dump`, `ui-confirm-dialog`, `ui-dewarp-viewer`, the `binarySize` pipe. |
| (later) `@ui-kit/react` | [react/](react/) | Not written yet: see [react/README.md](react/README.md) for how it would sit on the same core. |

The rule that keeps the layers apart: **a file in `core/` imports no framework**. If a change needs
logic that React would need too, it goes into core and the Angular component calls it. The Angular
components hold only what is Angular's: inputs, signals, templates, DOM events and Material.

## Build and test

```sh
cd core && npm install && npm test && npm run build      # Node + jsdom specs, then dist/
cd ../angular && npm install && npm run check            # core again, the Angular specs in headless Chromium, ng-packagr
```

`angular`'s specs run in a real browser (Vitest browser mode with Playwright): the grid's drag, scroll and
resize specs need layout. `npx playwright install chromium` once, if it is not there.

## Using it from an app

The apps take the built packages as `file:` dependencies:

```json
"@ui-kit/core": "file:../../web-ui-kit/core",
"@ui-kit/angular": "file:../../web-ui-kit/angular/dist"
```

and an `.npmrc` with `install-links=true`, so that npm **copies** the packages instead of linking them. A linked
package resolves `@angular/*` from its own folder, and two copies of Angular break the app. After rebuilding the kit,
run `npm install` in the app again.

Import from an entry point, never from the package root, so an app bundles only what it uses:

```ts
import { DataGridComponent, GridColumn } from '@ui-kit/angular/data-grid';
import { buildPdf, tableToXlsx, toCsv } from '@ui-kit/core/export';
import { downloadBytes } from '@ui-kit/core/dom';
```

Global styles (Material theme following `html[data-theme]`, compact form-field panels):

```scss
@use '@angular/material' as mat;
@use '@ui-kit/angular/styles/theme' as ui;

html { @include ui.theme(mat.$azure-palette); }
@include ui.globals;
```

## Consumers

- `libsql/tools/sql/ui`: the sql tool's web UI (grid, split panes, forms, theme, hex dump, dialogs; the report engine's
  exporters and chart drawing).
- `gscope/frontend`: the dashboard's sparkline charts and size pipe.
- `dewarp-viewer-angular`: the dewarp viewer now lives in `@ui-kit/angular/dewarp-viewer` and `@ui-kit/core/dewarp`;
  the demo app there still has its own copy until it is switched over.

## License

Apache 2.0, see [LICENSE](LICENSE) and [NOTICE](NOTICE). The test fonts in `core/testing/fonts` are Liberation Sans
under the SIL Open Font License ([OFL.txt](core/testing/fonts/OFL.txt)).
