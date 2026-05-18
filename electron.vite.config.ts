import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
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
  } as any
})
