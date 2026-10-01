import type { ElectronAPI, ElectronAPITransport } from './ipc'

export type { ElectronAPI } from './ipc'

declare global {
  interface Window {
    electronAPI: ElectronAPI
    readonly electronAPITransport?: ElectronAPITransport
  }
}
