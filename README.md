# Emoji Eraser

Emoji Eraser highlights emojis as diagnostics and provides a command to remove all emojis from the current file.

## Features

- 🔍 Shows a diagnostic on each detected emoji.
- ⚙️ Configurable diagnostic severity (Error, Warning, Information, Hint).
- 💡 **Quick Fix**: Click the lightbulb to remove individual emojis.
- 📝 Separate options to ignore emojis in comments and/or strings.
- 🎯 File exclusion patterns to skip specific files or folders.
- 📄 Automatically ignores all emojis in Markdown files (if `ignoreInComments` is enabled).
- 🗑️ Command: **Emoji Eraser: Remove all emojis** from the current file.

## Settings

- **`emojiChecker.ignoreInComments`** (boolean, default: `true`)
  - Ignores emojis in code comments (best-effort parsing for common languages).
  - Also ignores emojis entirely in Markdown files.

- **`emojiChecker.ignoreInStrings`** (boolean, default: `true`)
  - Ignores emojis in string literals (`'...'`, `"..."`, `` `...` ``).
  - Includes Python triple-quoted strings.

- **`emojiChecker.excludePatterns`** (array, default: `[]`)
  - Glob patterns for files to exclude from emoji checking.
  - Example: `["**/*.md", "**/test/**", "**/node_modules/**"]`

- **`emojiChecker.severity`** (string, default: `"Error"`)
  - Options: `"Error"`, `"Warning"`, `"Information"`, `"Hint"`
  - Controls the diagnostic severity level shown in the editor.

## Usage

1. Open the project in VS Code.
2. Press **F5** to launch an Extension Development Host.
3. Open a file containing emojis (e.g., `test/sample.txt`).
4. See diagnostics on detected emojis.
5. **Quick Fix**: Click the 💡 lightbulb icon on an emoji diagnostic and select "Remove this emoji".
6. **Bulk Remove**: Run **Emoji Eraser: Remove all emojis** from the Command Palette to remove all emojis at once.

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
