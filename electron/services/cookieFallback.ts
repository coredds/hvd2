import { classifyDownloadError } from './ErrorClassifier'

export function stripCookieArgs(args: string[]): string[] {
  const result: string[] = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cookies-from-browser') {
      i++
      continue
    }
    result.push(args[i])
  }
  return result
}

export function isBrowserCookieError(stderr: string): boolean {
  return classifyDownloadError(stderr) === 'cookies'
}
