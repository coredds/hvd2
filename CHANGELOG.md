# Changelog

## [2.2.0] - 2026-10-01

### Changed
- Upgraded the desktop runtime to Electron 43.7.7, resolving the remaining dependency audit findings. Development requires Node.js 22.12.0 or later; desktop builds require a 64-bit OS and macOS 12 or later.
- Shared typed IPC contracts now cover the preload and renderer. Download callbacks receive payloads without exposing privileged Electron event objects, while preserving matching listener cleanup.
- Persisted preferences are typed and normalized against defaults; malformed window bounds fall back safely without discarding other saved settings.
- Startup initialization has explicit lifecycle cleanup and stable hook dependencies, avoiding repeated checks on language changes or late state updates after unmount.
- Lint now enforces zero warnings, with regression coverage for event bridging, preference normalization, error messages, and startup cleanup.

## [2.1.1] - 2026-09-30

### Fixed
- Download progress, logs, completion, and errors now remain synchronized when switching to Settings or Logs.
- Paused downloads can be resumed with Start All. Intentional stops no longer become errors or trigger cookie fallback, and Pause All stops downloads concurrently.
- Removing an active queue entry waits for its process to stop; duplicate starts and late events from terminated processes are ignored.
- Completed downloads retain their final output path, including converted audio, so the open-file action works.
- Dependency installation waits for downloaded files to finish writing before extraction or replacement.
- Windows ZIP extraction now works when the app inherits a PowerShell 7 module path; extraction failures include the underlying error output.
- yt-dlp explicitly uses the installed Deno runtime for extraction commands.
- Unicode titles and output paths now use explicit UTF-8 output from yt-dlp on Windows, fixing corrupted smart quotes and other characters.

### Changed
- Removed unused `electron-store` and its production dependency chain; preferences continue using the existing JSON-backed service.
- Updated compatible development-tool dependencies to resolve available audit findings.
- CI now runs tests and lint before building installers on Windows, macOS, and Linux.
- Expanded regression coverage for download lifecycle, queue operations, dependency streams, archive helpers, and Unicode output.

## [2.1.0] - 2026-09-12

### Added
- Browser-cookie authentication for yt-dlp via `--cookies-from-browser`, configurable in Settings. The browser source defaults to Chrome and supports Chrome, Brave, Chromium, Edge, Firefox, Opera, and Vivaldi.
- Automatic retry without cookies when browser cookie extraction fails, so downloads still complete unauthenticated instead of erroring.
- Friendly, localized download errors (sign-in, cookies, FFmpeg, unavailable, network, unsupported) with per-row Retry, Sign in, and Details, plus a dismissible authentication banner and a Retry Failed queue action.
- Browser-aware sign-in, a "Test browser cookies" check, and an About line showing the installed app version.
- Pure `cookieFallback`, `ErrorClassifier`, `BrowserLauncher`, `authProviders`, and `errorPresentation` helpers with tests.

### Changed
- The "Log in" buttons now open the provider page in the browser selected under Browser Cookies Configuration instead of an embedded window.
- Preferences are now saved immediately, so the selected browser survives restarts.
- `extractTitle` sanitizes the browser source and only requests cookies when browser cookies are enabled.

### Fixed
- YouTube "Sign in to confirm you're not a bot" failures by passing the browser's cookies to yt-dlp.
- Errored downloads can now be retried and their URL re-added; previously an errored item was a dead end.
- Browser-cookie read failures are surfaced to the user instead of being hidden by the automatic retry.
- Removed the previous Electron-session cookie temp-file mechanism and the unused `app:get-cookies-file` IPC handler.

## [2.0.6] - 2026-08-03

### Fixed
- Audio and video downloads sharing the same output directory; queued items now use their configured `video.output.directory` or `audio.output.directory`.
- Per-item download option building so the active tab no longer changes queued downloads.

### Added
- `src/lib/buildDownloadOptions` pure helper for building per-item download options, with tests.

### Changed
- Project hygiene (2.0.5): added ESLint, unified the preload build, centralized default preferences, cleaned up renderer IPC listeners, extracted `DownloadParser` for testability, and added `AGENTS.md`.

## [2.0.4] - 2026-07-20

### Fixed
- yt-dlp update download failing on Windows due to file locking (antivirus/Defender). Now downloads to a temp file, deletes the old binary, then renames — with `yt-dlp -U` as automatic fallback.
- Same temp-file-and-rename pattern applied to FFmpeg and Deno binary extraction in `findAndMove`.
- preload.js was missing `getYtDlpLatestVersion` and `updateYtDlpSelf` — synced with preload.ts.

### Added
- `yt-dlp -U` self-update fallback when direct download fails (`deps:update-ytdlp-self` IPC).
- `UpdateSelf` method on `YtDlpService`.

## [2.0.3] - 2026-06-13

### Fixed
- Real dependency download and extraction (yt-dlp, FFmpeg, Deno).
- yt-dlp update check via GitHub API with date-based fallback.
- yt-dlp path redetection after download.

### Changed
- Hardcoded English strings replaced with i18next keys.

## [2.0.2] - 2026-06-08

### Fixed
- yt-dlp output encoding on Windows (latin1 fallback).
- Special character encoding on Windows (`PYTHONUTF8=1`).

## [2.0.1] - 2026-06-07

### Fixed
- CI: macOS .icns icon size, bin/.gitkeep for extraResources.
- yt-dlp path redetection after download, not just at startup.

## [2.0.0] - 2026-06-06

- Initial release.
