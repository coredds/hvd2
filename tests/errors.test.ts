import { describe, expect, it } from 'vitest'
import { getErrorMessage } from '../src/lib/errors'

describe('unknown error messages', () => {
  it('reads Error messages', () => {
    expect(getErrorMessage(new Error('disk full'))).toBe('disk full')
  })
  it('reads serialized error messages', () => {
    expect(getErrorMessage({ message: 'IPC unavailable' })).toBe('IPC unavailable')
  })
  it('retains thrown string messages', () => {
    expect(getErrorMessage('network failed')).toBe('network failed')
  })
  it('handles null and numbers', () => {
    expect(getErrorMessage(null)).toBe('null')
    expect(getErrorMessage(42)).toBe('42')
  })
  it('falls back when a message is empty or has an unexpected type', () => {
    expect(getErrorMessage(new Error())).toBe('Error')
    expect(getErrorMessage({ message: 42 })).toBe('[object Object]')
  })
})
