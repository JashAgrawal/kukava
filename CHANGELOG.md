# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Test suite.** Vitest with jsdom and Testing Library, covering every source
  module: validation schemas and sanitizers, formatting and DOM helpers, the
  country service including its offline fallback, all three Zustand stores, and
  every component from the OTP inputs down to the loading skeletons.
- **`npm test`, `npm run test:watch`, `npm run test:coverage`** scripts, plus
  `npm run typecheck` and `npm run verify` to run the whole gate in one command.
- **Structured logging** in `lib/logger.ts`. Every entry is a single JSON line
  carrying a level, an ISO timestamp and a redacted context object, gated by
  `LOG_LEVEL`. Phone numbers, OTP codes and tokens are redacted before anything
  reaches a sink.
- **Error tracking** in `lib/errorTracking.ts`, a single reporting seam that
  logs locally and forwards to a Sentry-compatible endpoint when
  `NEXT_PUBLIC_SENTRY_DSN` is set.
- **`ErrorBoundary`** (`components/ErrorBoundary.tsx`), wired around the app in
  `App.tsx`. Catches render errors and routes unhandled window errors and promise
  rejections through the same seam, with a retry affordance.
- **Container setup.** A multi-stage `Dockerfile`, a `docker-compose.yml` and a
  `.dockerignore`. The runtime image carries only the build output, runs as a
  non-root user and declares a health check.
- **CI** in `.github/workflows/ci.yml`: lint, typecheck, tests, build, a coverage
  floor enforced by `scripts/check-coverage.mjs`, and a Docker build with a
  container smoke test.
- **`.env.example`** documenting every environment variable the app reads.
- **Accessibility fixes** that the new tests surfaced: orphaned `<label>`
  elements in `LoginForm` and `CreateChatroomModal` now point at real form
  controls, the country selector became a labelled `combobox` with
  `listbox`/`option` roles, the send button gained a stable accessible name, the
  typing indicator announces itself via `role="status"`, and the sidebar and
  logout icon buttons in `Dashboard` were labelled.

### Changed

- The character counter in `ChatInput` was commented out while still being
  referenced by `aria-describedby`, leaving an empty live region for screen
  readers. It is now rendered and covered by tests.
- Debug `console.log` calls in `ChatInterface` and `ChatroomList` now go through
  the logger as `debug` records instead of printing object dumps on every
  scroll and keystroke.
- The simulated OTP is no longer written to the console, where it was readable
  by anything with devtools access. It is now reachable only through the store,
  and the log line records the send without the code.
- `npm run lint` runs `eslint .` directly rather than the deprecated
  `next lint` subcommand.

### Fixed

- **Closing the chatroom modal from the parent left the draft behind.**
  Toggling `isOpen` off did not reset the form state, so a half-typed title
  reappeared the next time it opened. It now resets on close.

### Documented

- Toasts requested with `duration: 0` fall back to the 5 second default, because
  the default is applied with `||`. The behaviour is now pinned by a test rather
  than left to be discovered.

## [0.1.0]

### Added

- Initial single-author release: Next.js 15 chat UI with a simulated AI
  backend, phone-number sign-in with OTP, chatroom list with search, image
  attachment with drag and drop, pagination and a light/dark theme.