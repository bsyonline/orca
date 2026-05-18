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
          }
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
