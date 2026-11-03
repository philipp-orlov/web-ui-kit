# @ui-kit/angular

Angular 22 / Material 3 components over [@ui-kit/core](../core). Standalone, signal-based, OnPush and
zoneless-safe. Colours, type and shapes come from the Material 3 tokens (`--mat-sys-*`), so they follow the app's
theme. Each entry point re-exports the core types it uses, so an app needs one import per component.

| Entry point | Components |
| --- | --- |
| `@ui-kit/angular/data-grid` | `ui-data-grid` (grouping, multi-sort, filters, paging, virtual scrolling, resize, reorder, column menu), `gridCell` and `gridGroupHeader` templates. See [lib/data-grid/README.md](lib/data-grid/README.md). |
| `@ui-kit/angular/split-layout` | `ui-split`, `ui-split-pane` (VS Code-style panes, maximise). See [lib/split-layout/README.md](lib/split-layout/README.md). |
| `@ui-kit/angular/charts` | `ui-sparkline-chart` (theme-aware, redraws on resize, gaps for missing values). |
| `@ui-kit/angular/forms` | `ui-select`, `ui-combo`, `ui-date`, `ui-text`, `ui-json-editor`, the `uiAutofocus` directive. |
| `@ui-kit/angular/theme` | `ThemeService`, `THEME_STORAGE_KEY`, `ui-theme-toggle`. |
| `@ui-kit/angular/dialogs` | `ui-confirm-dialog` (`ConfirmDialogComponent`, opened with `MatDialog`). |
| `@ui-kit/angular/hex-dump` | `ui-hex-dump`. |
| `@ui-kit/angular/dewarp-viewer` | `ui-dewarp-viewer` (`DewarpViewer`), `DEWARP_RENDERER_FACTORY`. |
| `@ui-kit/angular/utils` | `binarySize` pipe. |
| `@ui-kit/angular/styles/theme` (Sass) | `ui.theme(...)` and `ui.globals` mixins. |

```sh
npm install
npx playwright install chromium   # once
npm test        # the specs in headless Chromium (vitest browser mode)
npm run build   # builds core, then ng-packagr into dist/
npm run check   # core specs, core build, Angular specs, Angular build
```

Peer dependencies: `@angular/core`, `@angular/common` ^22.1, `@angular/material` and `@angular/cdk` ^22.1 for
the Material components, `@ui-kit/core` ^0.1.
