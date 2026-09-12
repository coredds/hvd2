# HVD Agent Guide

## Project Overview

HVD Video Downloader is an Electron + React desktop GUI that wraps [yt-dlp](https://github.com/yt-dlp/yt-dlp). It downloads video/audio, manages a download queue, and bundles optional dependencies (yt-dlp, FFmpeg, Deno).

## Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, i18next
- **Backend / Main process:** Electron 33, Node.js built-ins (`child_process`, `https`, `fs`, etc.)
- **State:** Zustand stores in `src/stores/`
- **IPC:** `electron/preload.ts` exposes a typed `window.electronAPI`
- **Internationalization:** 6 locales in `src/i18n/locales/`
- **Tests:** Vitest, files in `tests/`

## Directory Layout

```
electron/           # Main process code
  main.ts           # Entry point, IPC handlers, window lifecycle
  preload.ts        # Context-bridge API exposed to renderer
  services/         # yt-dlp wrapper, dependency manager, preferences, command builder
src/                # React renderer
  components/       # UI components
  lib/              # Pure, unit-testable helpers shared by components
  stores/           # Zustand stores
  i18n/             # Translations
  styles/           # Tailwind + CSS variables
  types.ts          # Shared types and default preferences
  electron.d.ts     # Window.electronAPI typings
tests/              # Vitest tests
```

## Common Commands

```bash
npm install
npm run dev          # Vite dev + Electron
npm run build        # TypeScript + Vite + Electron preload/main build
npm run electron:build   # Build installer via electron-builder
npm test             # Run Vitest
npm run lint         # ESLint on .ts/.tsx
```

## Conventions

- Use TypeScript strict mode.
- Prefer explicit types; use `unknown` over `any` when possible.
- Keep pure business logic (e.g., `CommandBuilder`, `DownloadParser`, `src/lib/buildDownloadOptions`) out of React components so it is unit-testable.
- IPC handlers live in `electron/main.ts`; the renderer side uses `window.electronAPI`.
- Empty `catch` blocks should include a comment explaining why the error is safe to ignore.
- Shared preference defaults live in `src/types.ts` (`DEFAULT_PREFERENCES`).

## Testing

- Add unit tests for pure helpers in `tests/`.
- I/O-heavy Electron services (dependency downloads, yt-dlp process management) should be tested via extracted pure logic, not by invoking real network/processes.
- Run `npm test`, `npx tsc --noEmit`, and `npm run lint` before considering work complete.

## Notes for Agents

- Do not edit `electron/preload.js` directly; it is built from `electron/preload.ts`.
- Renderer components register IPC listeners via `api.downloads.on*` and must clean them up with the matching `off*` methods.
- Dependency binary URLs point to upstream `latest` releases; do not add checksum verification unless explicitly requested.
- Browser-cookie auth flows from the `browser.cookies.enabled` / `browser.cookies.source` prefs through `buildDownloadOptionsForItem` to `CommandBuilder`, which emits `--cookies-from-browser`. Sources are sanitized by `normalizeBrowserSource` (`electron/services/CommandBuilder.ts`), and `YtDlpService` retries without cookies when extraction fails.
