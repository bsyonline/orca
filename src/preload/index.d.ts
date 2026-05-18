import { ElectronAPI as OrcaElectronAPI } from '../types'

declare global {
  interface Window {
    api: OrcaElectronAPI
  }
}
