# Changelog

## [2.0.5] - Unreleased

### Changed
- Project hygiene: added ESLint, unified the preload build, centralized default preferences, cleaned up renderer IPC listeners, extracted `DownloadParser` for testability, and added `AGENTS.md`.

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
