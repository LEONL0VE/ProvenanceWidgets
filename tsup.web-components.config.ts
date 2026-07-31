import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/web-components/index.tsx",
  },
  format: ["iife"],
  globalName: "ProvenanceWidgetsWebComponents",
  platform: "browser",
  target: "es2020",
  outDir: "dist/web-components",
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  noExternal: [/.*/],
  esbuildOptions(options) {
    options.alias = {
      ...options.alias,
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react-dom/client": "preact/compat/client",
      "react/jsx-runtime": "preact/jsx-runtime",
      "react/jsx-dev-runtime": "preact/jsx-runtime",
    };
    options.loader = {
      ...options.loader,
      ".js": "jsx",
    };
    options.jsx = "automatic";
    options.jsxImportSource = "preact";
  },
});
