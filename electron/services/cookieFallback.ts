const BROWSER_COOKIE_ERROR_RE = /cookies database|cookies-from-browser|failed to extract cookies|failed to decrypt.*cookies|decrypt.*cookies|dpapi/i

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
  return BROWSER_COOKIE_ERROR_RE.test(stderr)
}
