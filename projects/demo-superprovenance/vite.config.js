import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    // Widget source files use the .js extension but contain JSX (with the automatic
    // runtime, so React is not imported), alongside .ts strategy files. The 'tsx' esbuild
    // loader is a superset that handles js/jsx/ts/tsx uniformly, so a single loader works
    // for the whole mixed source tree. Replaces the old babel-loader preset-react/-typescript.
    esbuild: {
        loader: 'tsx',
        include: /\.[jt]sx?$/,
        exclude: [],
        jsx: 'automatic',
    },
    // esbuild's dependency pre-bundling needs the same hint for any .js files shipping JSX.
    optimizeDeps: {
        esbuildOptions: {
            loader: { '.js': 'jsx' },
        },
    },
    // Keep a single copy of React (and context-bearing libs) so hooks/providers work
    // across the demo and the sibling widget package. Replaces the webpack resolve.alias.
    resolve: {
        dedupe: ['react', 'react-dom', 'primereact', '@mantine/core'],
    },
});
