# @web-ui-kit/react (not written yet)

A React layer would be a sibling of [../angular](../angular) over the same [@web-ui-kit/core](../core), with no
logic of its own beyond React's:

| Angular (today) | React (sketch) | Core it calls |
| --- | --- | --- |
| `ui-data-grid` | `<DataGrid>` with `useMemo` over `filterItems` / `sortItems` / `buildView`, virtualised rows | `@web-ui-kit/core/grid` |
| `ui-sparkline-chart` | `<Sparkline>`: a `<canvas>` ref, a `ResizeObserver`, `drawSparkline` in an effect | `@web-ui-kit/core/charts` |
| `ThemeService` | `useTheme()`: `useState(storedTheme(key))`, `saveTheme` on change | `@web-ui-kit/core/theme` |
| `ui-split` | `<Split>`: pointer handlers, `sashTarget` / `fitPanes` | `@web-ui-kit/core/split` |
| `ui-hex-dump` | `<HexDump>` with a virtual list | `@web-ui-kit/core/hex` |
| `ui-dewarp-viewer` | `<DewarpViewer>`: canvas ref, `createDewarpRenderer`, `clampView` for pointer input | `@web-ui-kit/core/dewarp` |
| exporters | the same calls | `@web-ui-kit/core/export`, `@web-ui-kit/core/dom` |

The specs that pin the behaviour (`core/src/**/*.spec.ts`) already run without any framework, so a React layer
inherits them. Before writing a component here, move any logic still inside the matching Angular component into core.
