import { describe, expect, it } from 'vitest'
import { parseDownloadLine } from '../electron/services/DownloadParser'

describe('authoritative download paths', () => {
  it('parses JSON-escaped Windows paths with spaces and unicode', () => {
    const filePath = 'C:\\Users\\David\\Downloads\\日本語 audio.mp3'
    expect(parseDownloadLine(`HVD_FINAL_PATH:${JSON.stringify(filePath)}`, true, false).finalFilePath).toBe(filePath)
  })

  it('ignores malformed or non-string path output', () => {
    expect(parseDownloadLine('HVD_FINAL_PATH:not-json', false, false).finalFilePath).toBeUndefined()
    expect(parseDownloadLine('HVD_FINAL_PATH:null', false, false).finalFilePath).toBeUndefined()
  })
})
