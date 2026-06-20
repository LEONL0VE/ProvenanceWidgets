# demo-superprovenance

A showcase app for the SuperProvenance widgets, built with [Vite](https://vite.dev/)
and React. It renders the provenance-enabled components (checkbox group, input,
radio group, sliders, and single/multi-select dropdowns) from the sibling
[`superprovenance-widgets`](../superprovenance-widgets) package.

## Prerequisites

- Node.js 18+ and npm.

> **Note:** Run all commands from this directory (`projects/demo-superprovenance`).
> The repository root is an Angular multi-project workspace, so running npm
> scripts from the root resolves to `ng` instead of Vite. If you must run from
> elsewhere, use `npm --prefix projects/demo-superprovenance <script>`.

## Install

```bash
cd projects/demo-superprovenance
npm install
```

This also pulls in the widget dependencies (React, PrimeReact, D3, Mantine);
the demo imports the widget source directly from `../superprovenance-widgets/src`,
so no separate build of that package is required.

## Run the dev server

```bash
npm start
```

Vite starts on http://localhost:5173 with hot module replacement. To use a
different port:

```bash
npm start -- --port 5191
```

## Build for production

```bash
npm run build
```

The optimized output is written to `dist/`.

## Preview the production build

```bash
npm run preview
```

Serves the contents of `dist/` locally so you can verify the build before
deploying.
