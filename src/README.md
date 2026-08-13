# Source layout

- [`widgets`](./widgets): public React widgets and provenance views.
- [`provenance`](./provenance): the provider, context, and hooks that connect widgets to core.
- [`shared`](./shared): private components, contexts, hooks, and pure logic reused by widgets.
- [`types`](./types): public TypeScript contracts.
- [`web-components`](./web-components): custom-element wrappers around the React widgets.

[`index.ts`](./index.ts) is the React package's only public entry point. Files under `shared` are internal implementation details.
