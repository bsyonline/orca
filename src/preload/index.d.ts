import { ElectronAPI } from '@electron-toolkit/preload'
import { ElectronAPI as OrcaElectronAPI } from '../types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: OrcaElectronAPI
  }
}
