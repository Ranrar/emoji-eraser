# Copilot Instructions for Emoji Eraser

## Release Process

### 1. Update the Changelog

Before releasing a new version, update `CHANGELOG.md`:

1. Add changes under the `[Unreleased]` section with appropriate categories:
   - `### Added` - New features
   - `### Changed` - Changes to existing functionality
   - `### Fixed` - Bug fixes
   - `### Removed` - Removed features

2. When ready to release, move items from `[Unreleased]` to a new version section:
   ```markdown
   ## [Unreleased]
   
   ## [X.Y.Z] - YYYY-MM-DD
   
   ### Fixed
   - Description of fix
   ```

### 2. Update Version Number

Update the version in `package.json`:

```json
{
  "version": "X.Y.Z"
}
```

Follow semantic versioning:
- **Patch** (0.0.X) - Bug fixes
- **Minor** (0.X.0) - New features (backward compatible)
- **Major** (X.0.0) - Breaking changes

You can also use npm version commands:
```bash
npm version patch  # 0.1.1 -> 0.1.2
npm version minor  # 0.1.1 -> 0.2.0
npm version major  # 0.1.1 -> 1.0.0
```

### 3. Compile the Extension

Before publishing, always compile the TypeScript code:

```bash
npm run compile
```

### 4. Publish to VS Code Marketplace

To publish the extension manually:

```bash
vsce publish
```

This will:
- Compile the extension
- Package it as a .vsix file
- Upload to the VS Code Marketplace

**Prerequisites:**
- Have `@vscode/vsce` installed globally: `sudo npm install -g @vscode/vsce`
- Be logged in to your publisher account: `vsce login <publisher-name>`
- Have a valid Personal Access Token (PAT) from Azure DevOps with Marketplace > Manage permission

### 5. Alternative: Package Only

To create a .vsix file without publishing:

```bash
vsce package
```

This creates a file like `emoji-detector-X.Y.Z.vsix` that can be:
- Installed locally via VS Code
- Shared directly with users
- Published manually through the marketplace website

## Quick Release Checklist

- [ ] Update CHANGELOG.md with all changes
- [ ] Move changes from [Unreleased] to new version section
- [ ] Update version in package.json
- [ ] Run `npm run compile` to verify build
- [ ] Run `vsce publish` to release
- [ ] Verify extension appears on marketplace
- [ ] Test installation from marketplace

## Files to Update for Releases

1. **CHANGELOG.md** - Document all changes
2. **package.json** - Update version number
3. Compile TypeScript (automatic during publish)
4. No other files typically need manual updates

## Publisher Information

- Publisher name: `ranrar`
- Extension ID: `emoji-detector`
- Display name: `Emoji Eraser`
- Repository: https://github.com/Ranrar/emoji-eraser
