import { describe, it, expect } from 'vitest'
import { resolveBrowserExecutable } from '../electron/services/BrowserLauncher'

const env = {
  PROGRAMFILES: 'C:\\Program Files',
  'PROGRAMFILES(X86)': 'C:\\Program Files (x86)',
  LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local',
}

describe('resolveBrowserExecutable', () => {
  it('finds chrome in Program Files on Windows', () => {
    const target = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    expect(resolveBrowserExecutable('chrome', 'win32', (p) => p === target, env)).toBe(target)
  })

  it('returns the first existing candidate in order', () => {
    const first = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    const second = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    expect(resolveBrowserExecutable('edge', 'win32', (p) => p === first || p === second, env)).toBe(first)
  })

  it('returns null when no candidate exists', () => {
    expect(resolveBrowserExecutable('firefox', 'win32', () => false, env)).toBeNull()
  })

  it('resolves firefox on linux', () => {
    expect(resolveBrowserExecutable('firefox', 'linux', (p) => p === '/usr/bin/firefox', {})).toBe('/usr/bin/firefox')
  })

  it('returns null for an unknown source', () => {
    expect(resolveBrowserExecutable('netscape', 'win32', () => true, env)).toBeNull()
  })
})
