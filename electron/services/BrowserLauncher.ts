function joinWin(...parts: string[]): string {
  return parts.filter((part) => part.length > 0).join('\\')
}

function winCandidates(source: string, env: Record<string, string | undefined>): string[] {
  const pf = env.PROGRAMFILES
  const pf86 = env['PROGRAMFILES(X86)']
  const local = env.LOCALAPPDATA
  const list = (...segments: string[]) =>
    [pf, pf86, local].filter((base): base is string => Boolean(base)).map((base) => joinWin(base, ...segments))

  switch (source) {
    case 'chrome': return list('Google', 'Chrome', 'Application', 'chrome.exe')
    case 'chromium': return list('Chromium', 'Application', 'chrome.exe')
    case 'edge': return [pf86, pf].filter((b): b is string => Boolean(b)).map((b) => joinWin(b, 'Microsoft', 'Edge', 'Application', 'msedge.exe'))
    case 'brave': return list('BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
    case 'firefox': return list('Mozilla Firefox', 'firefox.exe')
    case 'opera': return local ? [joinWin(local, 'Programs', 'Opera', 'launcher.exe')] : []
    case 'vivaldi': return local ? [joinWin(local, 'Vivaldi', 'Application', 'vivaldi.exe')] : []
    default: return []
  }
}

function macCandidates(source: string): string[] {
  const apps: Record<string, [string, string]> = {
    chrome: ['Google Chrome', 'Google Chrome'],
    chromium: ['Chromium', 'Chromium'],
    edge: ['Microsoft Edge', 'Microsoft Edge'],
    brave: ['Brave Browser', 'Brave Browser'],
    firefox: ['Firefox', 'firefox'],
    opera: ['Opera', 'Opera'],
    vivaldi: ['Vivaldi', 'Vivaldi'],
  }
  const entry = apps[source]
  if (!entry) return []
  return [`/Applications/${entry[0]}.app/Contents/MacOS/${entry[1]}`]
}

function linuxCandidates(source: string): string[] {
  const bins: Record<string, string> = {
    chrome: 'google-chrome',
    chromium: 'chromium',
    edge: 'microsoft-edge',
    brave: 'brave-browser',
    firefox: 'firefox',
    opera: 'opera',
    vivaldi: 'vivaldi',
  }
  const bin = bins[source]
  return bin ? [`/usr/bin/${bin}`] : []
}

export function resolveBrowserExecutable(
  source: string,
  platform: NodeJS.Platform,
  exists: (candidate: string) => boolean,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const candidates =
    platform === 'win32' ? winCandidates(source, env)
      : platform === 'darwin' ? macCandidates(source)
        : linuxCandidates(source)
  return candidates.find(exists) ?? null
}
