import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.oraca.markdown',
  productName: 'Oraca',
  mac: {
    category: 'public.app-category.productivity',
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
  },
  directories: {
    output: 'release',
  },
}

export default config
