import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { defineConfig as defineVitestConfig } from 'vitest/config'

const isVitest = !!process.env.VITEST

export default isVitest
  ? defineVitestConfig({
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src')
        }
      },
      plugins: [react()],
      esbuild: {
        jsx: 'automatic'
      },
      test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test-setup.ts']
      }
    })
  : defineConfig({
      main: {
        plugins: [externalizeDepsPlugin()]
      },
      preload: {
        plugins: [externalizeDepsPlugin()]
      },
      renderer: {
        resolve: {
          alias: {
            '@renderer': resolve('src/renderer/src')
          },
          // Force a single physical copy of Milkdown's core packages. They define
          // module-level context Slices (e.g. nodesCtx) as singletons; duplicate
          // copies create distinct Slice identities, so a plugin from one copy
          // can't find a context injected by another → "Context 'nodes' not found".
          dedupe: ['@milkdown/core', '@milkdown/ctx', '@milkdown/prose', '@milkdown/transformer']
        },
        // Pre-bundle every Milkdown entry point the app imports in ONE optimize
        // pass. Otherwise Vite discovers some subpaths (e.g. /utils via the mermaid
        // plugin) lazily and re-bundles them separately, inlining a SECOND copy of
        // @milkdown/core — which is exactly what made the editor fail to mount.
        optimizeDeps: {
          include: [
            '@milkdown/kit/core',
            '@milkdown/kit/preset/commonmark',
            '@milkdown/kit/preset/gfm',
            '@milkdown/kit/plugin/history',
            '@milkdown/kit/plugin/listener',
            '@milkdown/kit/prose/state',
            '@milkdown/kit/prose/view',
            '@milkdown/kit/utils',
            '@milkdown/prose/tables',
            '@milkdown/plugin-prism',
            '@milkdown/react'
          ]
        },
        plugins: [react()],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        test: {
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test-setup.ts']
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
    })
