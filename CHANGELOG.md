# Changelog

All notable changes to the "Emoji Eraser" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [Released]

## [0.1.4] - 2026-01-15

### Fixed
- `excludePatterns` now treats basename-style globs like `*.xx` as matching files anywhere in the workspace (equivalent to also checking `**/*.xx`).

### Added
- Explorer context submenu (**Emoji Eraser**) with actions to exclude files/folders, exclude by extension (e.g. `*.rs`), and remove emojis from selected file(s).

## [0.1.3] - 2025-12-26

### Fixed
- Hardened `excludePatterns` glob matching to avoid incomplete escaping / regex injection issues.

## [0.1.2] - 2025-12-25

### Update
- Updated Readme file

## [0.1.1] - 2025-12-25

### Fixed
- Fixed SVG icon transparency

## [0.1.0] - 2025-12-25

### Added
- Initial release
- Quick fix to remove individual emojis
- Command to remove all emojis from file
- Settings:
  - `ignoreInComments` - Ignore emojis in code comments (default: true)
  - `ignoreInStrings` - Ignore emojis in string literals (default: false)
  - `ignoreMarkdown` - Ignore all emojis in Markdown files (default: true)
  - `excludePatterns` - Glob patterns to exclude files
  - `severity` - Configurable diagnostic severity
- Support for multiple languages (JavaScript, TypeScript, Python, etc.)
- Best-effort comment/string detection
- Extension icon
- Screenshots and documentation
