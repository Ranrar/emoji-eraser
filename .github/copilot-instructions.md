# Copilot Instructions for Emoji Eraser

## Release Process

### Automated Release (Recommended)

The extension uses GitHub Actions for automated releases:

1. **Update CHANGELOG.md** - Add changes under `[Unreleased]` section with appropriate categories:
   - `### Added` - New features
   - `### Changed` - Changes to existing functionality
   - `### Fixed` - Bug fixes
   - `### Removed` - Removed features

2. **Commit and push changes** to the `main` branch

3. **Run the Version Bump workflow:**
   - Go to GitHub → Actions → "Version Bump"
   - Click "Run workflow"
   - Select version bump type: `patch`, `minor`, or `major`
   - Click "Run workflow"

4. **Automated process will:**
   - Update `package.json` version
   - Move changelog items from `[Unreleased]` to new version section (manual step if needed)
   - Create a git tag (e.g., `v0.1.2`)
   - Create a GitHub release
   - **Automatically trigger** the "Publish Extension" workflow
   - Compile TypeScript code
   - Publish to VS Code Marketplace
   - Upload .vsix file to GitHub release

### Manual Release (Alternative)

If you need to publish manually:

1. **Update CHANGELOG.md** - Move items from `[Unreleased]` to new version section:
   ```markdown
   ## [Unreleased]
   
   ## [X.Y.Z] - YYYY-MM-DD
   
   ### Fixed
   - Description of fix
   ```

2. **Update version in `package.json`:**
   ```bash
   npm version patch  # 0.1.1 -> 0.1.2
   npm version minor  # 0.1.1 -> 0.2.0
   npm version major  # 0.1.1 -> 1.0.0
   ```

3. **Compile the extension:**
   ```bash
   npm run compile
   ```

4. **Publish to VS Code Marketplace:**
   ```bash
   vsce publish
   ```

5. **Create GitHub release manually** (optional)

**Manual Prerequisites:**
- Have `@vscode/vsce` installed globally: `sudo npm install -g @vscode/vsce`
- Be logged in to your publisher account: `vsce login ranrar`
- Have VSCE_TOKEN available

### Package Only (No Publishing)

To create a .vsix file without publishing:

```bash
vsce package
```

This creates a file like `emoji-detector-X.Y.Z.vsix` that can be:
- Installed locally via VS Code
- Shared directly with users
- Published manually through the marketplace website

## Required GitHub Secrets

The automated workflows require two secret tokens to be configured in the repository:

### 1. VSCE_TOKEN (Azure DevOps PAT)
- **Purpose:** Publishes the extension to VS Code Marketplace
- **How to create:**
  1. Go to https://dev.azure.com
  2. Click user icon → Personal Access Tokens
  3. Click "New Token"
  4. Name: `VS Code Marketplace`
  5. Organization: All accessible organizations
  6. Scopes: **Marketplace → Manage**
  7. Copy the token
- **Add to GitHub:**
  - Repository → Settings → Secrets and variables → Actions
  - New repository secret: `VSCE_TOKEN`
- **Renewal:** Tokens expire after 31 days - renew before expiration

### 2. PAT_TOKEN (GitHub PAT)
- **Purpose:** Allows version-bump workflow to trigger publish workflow
- **How to create:**
  1. GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
  2. Click "Generate new token"
  3. Name: `Emoji Eraser Workflows`
  4. Repository access: Only select repositories → emoji-eraser
  5. Permissions:
     - Contents: **Read and write**
     - Metadata: Read-only
     - Workflows: **Read and write**
  6. Copy the token
- **Add to GitHub:**
  - Repository → Settings → Secrets and variables → Actions
  - New repository secret: `PAT_TOKEN`
- **Renewal:** Tokens expire after 31 days - renew before expiration

### 3. GITHUB_TOKEN (Auto-provided)
- **Purpose:** Standard GitHub Actions operations
- **No setup needed** - automatically provided by GitHub
- Free and automatically renewed

## Quick Release Checklist

**Automated:**
- [ ] Update CHANGELOG.md with all changes under [Unreleased]
- [ ] Commit and push changes
- [ ] Run "Version Bump" workflow on GitHub
- [ ] Verify both workflows complete successfully
- [ ] Test installation from marketplace

**Manual:**
- [ ] Update CHANGELOG.md with all changes
- [ ] Move changes from [Unreleased] to new version section
- [ ] Update version in package.json
- [ ] Run `npm run compile` to verify build
- [ ] Run `vsce publish` to release
- [ ] Create GitHub release manually
- [ ] Test installation from marketplace

## Files to Update for Releases

1. **CHANGELOG.md** - Document all changes (always)
2. **package.json** - Version number (automated or manual)
3. TypeScript compilation (automatic)
4. No other files need updates

## Publisher Information

- Publisher name: `ranrar`
- Extension ID: `emoji-detector`
- Display name: `Emoji Eraser`
- Repository: https://github.com/Ranrar/emoji-eraser