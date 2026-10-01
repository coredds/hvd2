import path from 'path'

export function resolveArchiveTool(platform: string, archivePath: string): 'tar' | 'powershell' | 'ditto' | 'unzip' {
  if (archivePath.endsWith('.tar.xz') || archivePath.endsWith('.txz')) return 'tar'
  if (platform === 'win32') return 'powershell'
  if (platform === 'darwin') return 'ditto'
  return 'unzip'
}

export function tempFileExtension(url: string): string {
  const pathname = new URL(url).pathname
  if (pathname.endsWith('.tar.xz') || pathname.endsWith('.txz')) return '.tar.xz'
  return path.extname(pathname) || '.zip'
}

export function ffmpegMatcher(entryName: string): boolean {
  return entryName.endsWith('bin/ffmpeg.exe') || entryName.endsWith('bin/ffmpeg')
    || entryName.endsWith('ffmpeg.exe') || entryName.endsWith('ffmpeg')
}

export function denoMatcher(entryName: string, platform: string): boolean {
  const target = platform === 'win32' ? 'deno.exe' : 'deno'
  return entryName === target || entryName.endsWith('/' + target)
}

export function escapePowershell(value: string): string {
  return value.replace(/'/g, "''")
}

export function getWindowsPowerShellEnvironment(inherited: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  // PowerShell 5 must discover its own modules rather than inherit PowerShell 7's.
  return Object.fromEntries(Object.entries(inherited).filter(([key]) => key.toLowerCase() !== 'psmodulepath'))
}
