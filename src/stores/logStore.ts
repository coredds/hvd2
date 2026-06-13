import { create } from 'zustand'

interface LogStore {
  lines: string[]
  appendLog: (line: string) => void
  clearLogs: () => void
}

function formatTimestamp(): string {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export const useLogStore = create<LogStore>((set) => ({
  lines: [],

  appendLog: (line) =>
    set((state) => ({
      lines: [...state.lines, `[${formatTimestamp()}] ${line}`],
    })),

  clearLogs: () => set({ lines: [] }),
}))