# @web-ui-kit/core

The framework-free half of the ui-kit: plain TypeScript, ES modules, no runtime dependencies (hls.js is an optional
peer, loaded only for `.m3u8` sources). Nothing here imports Angular, React or any other UI framework. That is the
point: every UI layer renders the same logic.

| Entry point | Contents |
| --- | --- |
| `@web-ui-kit/core/grid` | Grid model (`GridColumn`, sort/group/filter descriptors, `GridState`) and `filterItems`, `sortItems`, `buildView`, `effectiveSort`, `defaultCompare`, `moveItem`. |
| `@web-ui-kit/core/charts` | `drawSparkline` (canvas) with `computePoints`, `indexFromX`, `withAlpha`; `drawChart` (bars, lines, areas, pies as drawing primitives), `niceScale`, `PALETTE`. |
| `@web-ui-kit/core/export` | Drawing primitives (`PageDoc`, `Prim`); `buildPdf` (TrueType subsetting, PNG/JPEG); `pageToSvg`; `toCsv` (with `safe` against formula injection); the XLSX writer (`XlsxStyles`, `XlsxSheet`, `buildWorkbook`, `tableToXlsx`); `buildZip` / `readZip`; `TrueTypeFont`; image decoding. |
| `@web-ui-kit/core/format` | `formatNumber` (`#,##0.00` patterns), `formatDate`, `formatValue`, `toDate`; `formatBinarySize`, `formatBytes`; `jsonHtml` (JSON syntax colouring). |
| `@web-ui-kit/core/theme` | `storedTheme`, `saveTheme`, `applyTheme`, `THEME_OPTIONS`. |
| `@web-ui-kit/core/dom` | `downloadBlob`, `downloadText`, `downloadBytes`. |
| `@web-ui-kit/core/hex` | Hex-dump layout: offsets, bytes, characters, regions, selection. |
| `@web-ui-kit/core/split` | Split-pane sizing: `sashTarget`, `fitPanes`. |
| `@web-ui-kit/core/dewarp` | Fisheye lens models, view maths and clamping, source detection and HLS, the WebGL 2 `DewarpRenderer`. |

```sh
npm install
npm test        # vitest: Node, and jsdom where a spec says so
npm run build   # esbuild (one module per entry point, shared chunks) + tsc declarations into dist/
```
