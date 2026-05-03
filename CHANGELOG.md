# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-05-03
### Changed
- Renamed canonical public path from `/gmail-dot-email-generator` to `/gmail-dot-variations-generator`.
- `deploy.sh`: new `LEGACY_BASE_PATHS` config; Cloud Run env now also sets `APP_LEGACY_BASE_PATHS` so the legacy path keeps serving traffic.

### Deployment
- Deployed to Google Cloud Run on 2026-05-03.
  - Project: `iexcel-agents`
  - Region: `us-central1`
  - Service: `ixl-gmail-dot-generator`
  - Revision: `ixl-gmail-dot-generator-00008-74t` (100% traffic)
  - Image: `gcr.io/iexcel-agents/ixl-gmail-dot-generator:latest`
  - Runtime SA: `gmail-dot-gen-sheets@iexcel-agents.iam.gserviceaccount.com`
- Live URLs verified (HTTP 200):
  - Canonical: https://agents.iexcel.co/gmail-dot-variations-generator
  - Legacy fallback: https://agents.iexcel.co/gmail-dot-email-generator
  - Cloud Run: https://ixl-gmail-dot-generator-454575866716.us-central1.run.app
- Page title in production: `Free Gmail Dot Variations Generator | iExcel`.

## [1.2.0] - 2026-05-03
### Added
- **Plus-tag (`+alias`) variations** alongside dot variations.
  - `DEFAULT_PLUS_TAGS`: `signup`, `newsletter`, `promo`, `social`, `shop`.
  - `normalizePlusTags()` and `generatePlusTagVariants()` in `gmailDots.js`.
  - "Plus tags (optional)" input on the service page.
- **Google Workspace custom-domain support.**
  - `parseGmailAddress` accepts `options.workspaceDomain`.
  - "Using Google Workspace?" checkbox + custom-domain input.
  - Verified: `mycorp.com` produces 51 dot variants on `@mycorp.com`.
- **GTM IDs** wired through the service page.
- New test suite `test-variations.js` (13 tests) covering dot, plus-tag, and Workspace variants. Total: 26/26 passing (up from 13).
- Sheet schema extended with 5 columns: `Is Workspace`, `Workspace Domain`, `Plus Tags Used`, `Plus Variant Count`, `Consent`. Existing sheets auto-extend headers on first write.
- Console logging breadcrumb when Sheets logging is disabled.

### Fixed
- **GDV-003**: Footer "Contact" link now points to `https://iexcel.co/#contact-us` (was a broken `/contact` 404).
- **GDV-004**: Removed personal `tel:` link; replaced with the iExcel homepage contact anchor.
- **GDV-005**: `server.js` no longer 400s Workspace submissions before they reach the sheet.

## [1.1.0] - 2026-03-30T12:45:00-05:00
### Added
- New integration test suite in `tests/integration.test.js` to verify permutation counts and filtering.
- "Copy All (All Pages)" button to capture every generated Gmail variation in one click.

### Changed
- Increased maximum visible variations on screen from 10 to 51.
- Updated "Copy Page" button logic and messaging for better clarity.
- Refined status bar feedback to show accurate generation and visibility counts.
- Adjusted UI font weights for improved readability.
