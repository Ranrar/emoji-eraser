# Emoji Eraser

Emoji Eraser highlights emojis as diagnostics and provides a command to remove all emojis from the current file.

<p align="center">
  <img src="icon.png" width="128" height="128" alt="Emoji Eraser icon" />
</p>

## Why I created this extension

When I'm programming, I often use emojis as placeholders while I'm sketching things out, then later swap them out for SVGs (or other proper assets). Having them highlighted makes them easy to find and replace when it's time to "clean it up."

Also: I'm not a fan of how often AI tooling sprinkles emojis into text and documentation these days. This extension helps me catch and remove them before they slip into commits.

Emoji Eraser exists to:

- Make emojis visible (as diagnostics) instead of quietly hiding in plain sight.
- Remove them fast (bulk command + per-emoji quick fix).
- Stay configurable so you can ignore the places where emojis *are* welcome (comments, strings, Markdown).

## Features

- 🔍 Shows a diagnostic on each detected emoji.
- ⚙️ Configurable diagnostic severity (Error, Warning, Information, Hint).
- 💡 **Quick Fix**: Click the lightbulb to remove individual emojis.
- 📝 Separate options to ignore emojis in comments, strings, and Markdown files.
- 🎯 File exclusion patterns to skip specific files or folders.
- 🗑️ Command Palette: **Emoji Eraser: Remove all emojis (current file)**.
- 🖱️ Explorer right-click menu: **Emoji Eraser** submenu with actions to:
  - Remove emojis from selected file(s)
  - Exclude this file / exclude this folder
  - Exclude all files with the same extension (e.g. `*.rs`)

## Screenshots

### Diagnostics in Action
![Emoji diagnostics showing detected emojis](screenshots/Screenshot_1.png)

### Extension Settings
![Emoji Eraser configuration settings](screenshots/Screenshot_2.png)

## Settings

- **`emojiChecker.ignoreInComments`** (boolean, default: `true`)
  - Ignores emojis in code comments (best-effort parsing for common languages).

- **`emojiChecker.ignoreInStrings`** (boolean, default: `false`)
  - Ignores emojis in string literals (`'...'`, `"..."`, `` `...` ``).
  - Includes Python triple-quoted strings.

- **`emojiChecker.ignoreMarkdown`** (boolean, default: `true`)
  - Ignores all emojis in Markdown and MDX files.

- **`emojiChecker.excludePatterns`** (array, default: `[]`)
  - Glob-like patterns for files/folders to exclude from emoji checking.
  - These are matched against the **workspace-relative path**.
  - Simple examples (the "easy to type" ones):
    - `"*.md"` → exclude all Markdown files (anywhere in the workspace)
    - `"README.md"` → exclude any file named `README.md`
    - `"node_modules"` → exclude any `node_modules` folder and everything inside it
  - Path examples:
    - `"dist/**"` → exclude `dist/` at the workspace root
    - `"**/dist/**"` → exclude any `dist/` folder anywhere
    - `"test/**"` or `"**/test/**"` → exclude tests

- **`emojiChecker.severity`** (string, default: `"Error"`)
  - Options: `"Error"`, `"Warning"`, `"Information"`, `"Hint"`
  - Controls the diagnostic severity level shown in the editor.

## Usage

1. Open the project in VS Code.
2. Press **F5** to launch an Extension Development Host.
3. Open a file containing emojis (e.g., `test/sample.txt`).
4. See diagnostics on detected emojis.
5. **Quick Fix**: Click the 💡 lightbulb icon on an emoji diagnostic and select "Remove this emoji".
6. **Bulk Remove (current file)**: Run **Emoji Eraser: Remove all emojis (current file)** from the Command Palette.
7. **Bulk Remove (many files)**: Select files in the Explorer, right-click, then choose **Emoji Eraser → Remove emojis from selected file(s)**.

## Examples

### Default behavior (both ignore settings enabled)
Only emojis in plain code/text are highlighted:
```javascript
const x = "Hello 😀";  // ← emoji ignored (in string)
// Nice work! 🔥       // ← emoji ignored (in comment)
const y = 🎉;          // ← emoji DETECTED (plain code)
```

### Detect emojis in strings only
Set `"emojiChecker.ignoreInComments": true` and `"emojiChecker.ignoreInStrings": false`:
```javascript
const x = "Hello 😀";  // ← emoji DETECTED (in string)
// Nice work! 🔥       // ← emoji ignored (in comment)
```

### Detect all emojis everywhere
Set both to `false`:
```javascript
const x = "Hello 😀";  // ← emoji DETECTED
// Nice work! 🔥       // ← emoji DETECTED
```