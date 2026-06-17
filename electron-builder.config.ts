import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.orca.markdown',
  productName: 'orca',
  mac: {
    category: 'public.app-category.productivity',
    icon: 'build/icon.icns',
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
  },
  win: {
    icon: 'build/icon.ico',
  },
  linux: {
    icon: 'build/icon.png',
  },
  directories: {
    buildResources: 'build',
    output: 'release',
  },
}

export default config
