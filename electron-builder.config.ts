import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.orca.markdown',
  productName: 'Orca',
  artifactName: '${name}-${version}-${arch}.${ext}',
  fileAssociations: [
    {
      ext: ['md', 'markdown'],
      name: 'Markdown Document',
      description: 'Markdown document',
      role: 'Editor',
      mimeType: 'text/markdown',
      rank: 'Owner',
    },
  ],
  mac: {
    category: 'public.app-category.productivity',
    icon: 'build/icon.icns',
    entitlementsInherit: 'build/entitlements.mac.plist',
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    extendInfo: {
      CFBundleDisplayName: 'Orca',
      CFBundleName: 'Orca',
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: 'Markdown Document',
          CFBundleTypeRole: 'Editor',
          CFBundleTypeExtensions: ['md', 'markdown'],
          LSHandlerRank: 'Owner',
          LSItemContentTypes: ['net.daringfireball.markdown', 'public.markdown', 'public.plain-text'],
        },
      ],
      NSDocumentsFolderUsageDescription: "orca needs access to the user's Documents folder to open and edit Markdown files.",
      NSDownloadsFolderUsageDescription: "orca needs access to the user's Downloads folder to open and edit Markdown files.",
    },
    notarize: false,
  },
  win: {
    icon: 'build/icon.ico',
    executableName: 'orca',
  },
  linux: {
    icon: 'build/icon.png',
    target: ['AppImage', 'snap', 'deb'],
    maintainer: 'orca',
    category: 'Utility',
  },
  directories: {
    buildResources: 'build',
    output: 'release',
  },
  asarUnpack: ['resources/**'],
  npmRebuild: false,
}

export default config
