import * as vscode from 'vscode';
import emojiRegex from 'emoji-regex';

type IgnoreRange = readonly [start: number, endExclusive: number];

function getSeverity(): vscode.DiagnosticSeverity {
    const config = vscode.workspace.getConfiguration('emojiChecker');
    const value = (config.get<string>('severity', 'Error') || 'Error').toLowerCase();
    switch (value) {
        case 'warning':
            return vscode.DiagnosticSeverity.Warning;
        case 'information':
            return vscode.DiagnosticSeverity.Information;
        case 'hint':
            return vscode.DiagnosticSeverity.Hint;
        case 'error':
        default:
            return vscode.DiagnosticSeverity.Error;
    }
}

function getIgnoreSettings(): { ignoreInComments: boolean; ignoreInStrings: boolean; ignoreMarkdown: boolean } {
    const config = vscode.workspace.getConfiguration('emojiChecker');
    return {
        ignoreInComments: config.get<boolean>('ignoreInComments', true),
        ignoreInStrings: config.get<boolean>('ignoreInStrings', false),
        ignoreMarkdown: config.get<boolean>('ignoreMarkdown', true)
    };
}

function getExcludePatterns(): string[] {
    const config = vscode.workspace.getConfiguration('emojiChecker');
    return config.get<string[]>('excludePatterns', []);
}

function getConfigTarget(): vscode.ConfigurationTarget {
    // Best practice: prefer workspace settings so the rule applies to the current project.
    // Fall back to global settings when there's no workspace open.
    return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;
}

async function addExcludePattern(pattern: string): Promise<boolean> {
    const normalized = normalizeToPosixPath((pattern ?? '').trim());
    if (!normalized) return false;

    const config = vscode.workspace.getConfiguration('emojiChecker');
    const existing = (config.get<string[]>('excludePatterns', []) || [])
        .map((p) => normalizeToPosixPath((p ?? '').trim()))
        .filter(Boolean);

    if (existing.includes(normalized)) {
        return false;
    }

    await config.update('excludePatterns', [...existing, normalized], getConfigTarget());
    return true;
}

function getRelativePathForResource(uri: vscode.Uri): string {
    return normalizeToPosixPath(vscode.workspace.asRelativePath(uri, false));
}

function getFileExtension(relativePath: string): string | undefined {
    const fileName = relativePath.split('/').pop() || '';
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot <= 0 || lastDot === fileName.length - 1) return undefined;
    return fileName.slice(lastDot + 1);
}

function toSelectedFileUris(primary?: vscode.Uri, selection?: vscode.Uri[] | vscode.Uri): vscode.Uri[] {
    const out: vscode.Uri[] = [];

    const add = (u?: vscode.Uri) => {
        if (!u) return;
        if (u.scheme !== 'file') return;
        if (!out.some((x) => x.toString() === u.toString())) out.push(u);
    };

    add(primary);

    if (Array.isArray(selection)) {
        for (const u of selection) add(u);
    } else {
        add(selection);
    }

    return out;
}

async function removeEmojisFromUri(uri: vscode.Uri): Promise<boolean> {
    // If the document is open, edit that buffer + save to avoid conflicts with on-disk edits.
    const openDoc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString() && !d.isClosed);
    const re = emojiRegex();

    if (openDoc) {
        const text = openDoc.getText();
        const newText = text.replace(re, '');
        if (newText === text) return false;

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(openDoc.positionAt(0), openDoc.positionAt(text.length));
        edit.replace(openDoc.uri, fullRange, newText);
        const applied = await vscode.workspace.applyEdit(edit);
        if (!applied) return false;
        await openDoc.save();
        return true;
    }

    // Not open: edit on disk.
    const bytes = await vscode.workspace.fs.readFile(uri);
    const text = Buffer.from(bytes).toString('utf8');
    const newText = text.replace(re, '');
    if (newText === text) return false;

    await vscode.workspace.fs.writeFile(uri, Buffer.from(newText, 'utf8'));
    return true;
}

function normalizeToPosixPath(value: string): string {
    // VS Code may return OS-specific separators; normalize to a stable form.
    return value.replace(/\\/g, '/');
}

function globToRegExp(glob: string): RegExp {
    // Convert a small, safe subset of glob syntax to a RegExp.
    // Supported: **, *, ?, and path separators.
    // Everything else is escaped to avoid regex injection / incomplete escaping.

    const g = normalizeToPosixPath(glob);
    let out = '^';

    for (let i = 0; i < g.length; i++) {
        const ch = g[i];

        if (ch === '*') {
            if (g[i + 1] === '*') {
                // "**" matches across path separators
                out += '.*';
                i++;
            } else {
                // "*" matches within a single path segment
                out += '[^/]*';
            }
            continue;
        }

        if (ch === '?') {
            out += '[^/]';
            continue;
        }

        // Escape regex metacharacters.
        if (/[-/\\^$+?.()|[\]{}]/.test(ch)) {
            out += '\\' + ch;
        } else {
            out += ch;
        }
    }

    out += '$';
    return new RegExp(out);
}

function isFileExcluded(uri: vscode.Uri): boolean {
    const patterns = getExcludePatterns();
    if (patterns.length === 0) return false;

    const relativePath = normalizeToPosixPath(vscode.workspace.asRelativePath(uri, false));

    for (const rawPattern of patterns) {
        const pattern = normalizeToPosixPath((rawPattern ?? '').trim());
        if (!pattern) continue;

        const hasSlash = pattern.includes('/');
        const hasGlobMeta = /[*?]/.test(pattern);

        // Users typically expect:
        // - "*.md" to match any markdown file anywhere (root + nested)
        // - "node_modules" to exclude that folder and everything in it
        // Even though VS Code globbing is richer, we implement a small subset here.
        const expandedPatterns: string[] = [pattern];

        if (!hasSlash) {
            // Make basename patterns apply to nested files too.
            expandedPatterns.push(`**/${pattern}`);

            // If it's a plain name (no glob meta), also treat it as a folder name.
            // Add both root and nested folder variants because our simple glob->regex
            // implementation treats "**/" as requiring at least one segment.
            if (!hasGlobMeta) {
                expandedPatterns.push(`${pattern}/**`);
                expandedPatterns.push(`**/${pattern}/**`);
            }
        }

        for (const p of expandedPatterns) {
            const matcher = globToRegExp(p);
            if (matcher.test(relativePath)) {
                return true;
            }
        }
    }
    return false;
}

function mergeRanges(ranges: IgnoreRange[]): IgnoreRange[] {
    if (ranges.length <= 1) return ranges.slice();
    const sorted = ranges
        .slice()
        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
    const merged: IgnoreRange[] = [];
    let [curStart, curEnd] = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
        const [s, e] = sorted[i];
        if (s <= curEnd) {
            curEnd = Math.max(curEnd, e);
        } else {
            merged.push([curStart, curEnd]);
            curStart = s;
            curEnd = e;
        }
    }
    merged.push([curStart, curEnd]);
    return merged;
}

function isOffsetInRanges(offset: number, ranges: IgnoreRange[]): boolean {
    // ranges are sorted, non-overlapping, [start, end)
    let lo = 0;
    let hi = ranges.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const [s, e] = ranges[mid];
        if (offset < s) {
            hi = mid - 1;
        } else if (offset >= e) {
            lo = mid + 1;
        } else {
            return true;
        }
    }
    return false;
}

function getCommentSyntax(languageId: string): {
    line: string[];
    block: Array<readonly [start: string, end: string]>;
    supportsBacktickStrings: boolean;
    supportsPythonTripleQuotes: boolean;
} {
    const id = languageId.toLowerCase();

    if (id === 'markdown' || id === 'mdx') {
        return { line: [], block: [], supportsBacktickStrings: false, supportsPythonTripleQuotes: false };
    }

    if (id === 'html' || id === 'xml' || id === 'xhtml') {
        return {
            line: [],
            block: [['<!--', '-->']],
            supportsBacktickStrings: false,
            supportsPythonTripleQuotes: false
        };
    }

    if (id === 'python') {
        return {
            line: ['#'],
            block: [],
            supportsBacktickStrings: false,
            supportsPythonTripleQuotes: true
        };
    }

    if (id === 'shellscript' || id === 'bash' || id === 'sh' || id === 'yaml' || id === 'toml' || id === 'ruby') {
        return {
            line: ['#'],
            block: [],
            supportsBacktickStrings: true,
            supportsPythonTripleQuotes: false
        };
    }

    if (id === 'sql') {
        return {
            line: ['--'],
            block: [['/*', '*/']],
            supportsBacktickStrings: false,
            supportsPythonTripleQuotes: false
        };
    }

    if (id === 'css' || id === 'scss' || id === 'less') {
        return {
            line: [],
            block: [['/*', '*/']],
            supportsBacktickStrings: false,
            supportsPythonTripleQuotes: false
        };
    }

    // Default to C/JS-like syntax.
    return {
        line: ['//'],
        block: [['/*', '*/']],
        supportsBacktickStrings: id === 'javascript' || id === 'typescript' || id === 'javascriptreact' || id === 'typescriptreact',
        supportsPythonTripleQuotes: false
    };
}

function buildIgnoreRanges(
    text: string,
    languageId: string,
    ignoreInComments: boolean,
    ignoreInStrings: boolean,
    ignoreMarkdown: boolean
): IgnoreRange[] {
    // Check if this is markdown - handle it separately
    const isMarkdown = languageId.toLowerCase() === 'markdown' || languageId.toLowerCase() === 'mdx';
    if (isMarkdown) {
        // For markdown files, ONLY ignoreMarkdown setting matters
        if (ignoreMarkdown) {
            return text.length > 0 ? [[0, text.length]] : [];
        } else {
            return []; // Don't ignore anything in markdown if setting is false
        }
    }

    // For non-markdown files, use ignoreInComments and ignoreInStrings
    if (!ignoreInComments && !ignoreInStrings) return [];

    const syntax = getCommentSyntax(languageId);

    const ranges: IgnoreRange[] = [];

    type State =
        | 'code'
        | 'lineComment'
        | 'blockComment'
        | 'single'
        | 'double'
        | 'backtick'
        | 'tripleSingle'
        | 'tripleDouble';

    let state: State = 'code';
    let stateStart = 0;
    let blockEnd = '';
    let i = 0;

    const startsWith = (needle: string) => needle.length > 0 && text.startsWith(needle, i);

    const enter = (nextState: State, startOffset: number, endSeq?: string) => {
        state = nextState;
        stateStart = startOffset;
        blockEnd = endSeq ?? '';
    };

    const exit = (endExclusive: number) => {
        ranges.push([stateStart, endExclusive]);
        state = 'code';
        stateStart = 0;
        blockEnd = '';
    };

    while (i < text.length) {
        const ch = text[i];

        if (state === 'code') {
            // Python triple quotes
            if (syntax.supportsPythonTripleQuotes && ignoreInStrings) {
                if (text.startsWith("'''", i)) {
                    enter('tripleSingle', i);
                    i += 3;
                    continue;
                }
                if (text.startsWith('"""', i)) {
                    enter('tripleDouble', i);
                    i += 3;
                    continue;
                }
            }

            // Block comments
            if (ignoreInComments) {
                let enteredBlock = false;
                for (const [startSeq, endSeq] of syntax.block) {
                    if (text.startsWith(startSeq, i)) {
                        enter('blockComment', i, endSeq);
                        i += startSeq.length;
                        enteredBlock = true;
                        break;
                    }
                }
                if (enteredBlock) continue;

                // Line comments
                let enteredLine = false;
                for (const startSeq of syntax.line) {
                    if (text.startsWith(startSeq, i)) {
                        enter('lineComment', i);
                        i += startSeq.length;
                        enteredLine = true;
                        break;
                    }
                }
                if (enteredLine) continue;
            }

            // Strings
            if (ignoreInStrings) {
                if (ch === "'") {
                    enter('single', i);
                    i++;
                    continue;
                }
                if (ch === '"') {
                    enter('double', i);
                    i++;
                    continue;
                }
                if (ch === '`' && syntax.supportsBacktickStrings) {
                    enter('backtick', i);
                    i++;
                    continue;
                }
            }

            i++;
            continue;
        }

        if (state === 'lineComment') {
            if (ch === '\n') {
                exit(i);
                i++;
            } else {
                i++;
            }
            continue;
        }

        if (state === 'blockComment') {
            if (blockEnd && startsWith(blockEnd)) {
                i += blockEnd.length;
                exit(i);
            } else {
                i++;
            }
            continue;
        }

        if (state === 'tripleSingle') {
            if (text.startsWith("'''", i)) {
                i += 3;
                exit(i);
            } else {
                i++;
            }
            continue;
        }

        if (state === 'tripleDouble') {
            if (text.startsWith('"""', i)) {
                i += 3;
                exit(i);
            } else {
                i++;
            }
            continue;
        }

        // single/double/backtick strings
        if (ch === '\\') {
            i += 2;
            continue;
        }

        if (state === 'single' && ch === "'") {
            i++;
            exit(i);
            continue;
        }
        if (state === 'double' && ch === '"') {
            i++;
            exit(i);
            continue;
        }
        if (state === 'backtick' && ch === '`') {
            i++;
            exit(i);
            continue;
        }

        i++;
    }

    // Close any unterminated region at EOF.
    if (state !== 'code') {
        exit(text.length);
    }

    return mergeRanges(ranges);
}

function computeDiagnostics(document: vscode.TextDocument): vscode.Diagnostic[] {
    const text = document.getText();
    const { ignoreInComments, ignoreInStrings, ignoreMarkdown } = getIgnoreSettings();
    const ignoredRanges = buildIgnoreRanges(text, document.languageId, ignoreInComments, ignoreInStrings, ignoreMarkdown);
    const severity = getSeverity();

    const issues: vscode.Diagnostic[] = [];
    const re = emojiRegex();
    re.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = re.exec(text)) !== null) {
        const emojiText = match[0];
        const startOffset = match.index;

        if (ignoredRanges.length > 0 && isOffsetInRanges(startOffset, ignoredRanges)) {
            continue;
        }

        const start = document.positionAt(startOffset);
        const end = document.positionAt(startOffset + emojiText.length);
        const range = new vscode.Range(start, end);
        issues.push(
            new vscode.Diagnostic(range, 'Emoji detected', severity)
        );
    }

    return issues;
}

export function activate(context: vscode.ExtensionContext) {
    const diagnostics = vscode.languages.createDiagnosticCollection('emoji-eraser');
    context.subscriptions.push(diagnostics);

    const pendingUpdates = new Map<string, NodeJS.Timeout>();

    const updateNow = (document: vscode.TextDocument) => {
        if (document.isClosed) return;
        if (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled') return;
        if (isFileExcluded(document.uri)) {
            diagnostics.delete(document.uri);
            return;
        }
        diagnostics.set(document.uri, computeDiagnostics(document));
    };

    const scheduleUpdate = (document: vscode.TextDocument, delayMs = 150) => {
        const key = document.uri.toString();
        const existing = pendingUpdates.get(key);
        if (existing) clearTimeout(existing);
        pendingUpdates.set(
            key,
            setTimeout(() => {
                pendingUpdates.delete(key);
                updateNow(document);
            }, delayMs)
        );
    };

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((doc) => scheduleUpdate(doc, 0)),
        vscode.workspace.onDidChangeTextDocument((e) => scheduleUpdate(e.document, 150)),
        vscode.workspace.onDidCloseTextDocument((doc) => diagnostics.delete(doc.uri)),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('emojiChecker')) {
                for (const doc of vscode.workspace.textDocuments) {
                    scheduleUpdate(doc, 0);
                }
            }
        })
    );

    for (const doc of vscode.workspace.textDocuments) {
        scheduleUpdate(doc, 0);
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('emojiChecker.removeEmoji', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;

            const doc = editor.document;
            const text = doc.getText();
            const re = emojiRegex();
            const newText = text.replace(re, '');

            if (newText === text) return;

            const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(text.length));
            await editor.edit((editBuilder) => {
                editBuilder.replace(fullRange, newText);
            });
        })
    );

    // Context-menu helpers: quickly add excludePatterns entries.
    context.subscriptions.push(
        vscode.commands.registerCommand('emojiChecker.excludeThisFile', async (resourceUri?: vscode.Uri) => {
            if (!resourceUri) return;
            const rel = getRelativePathForResource(resourceUri);
            const added = await addExcludePattern(rel);
            if (added) {
                vscode.window.showInformationMessage(`Emoji Eraser: excluded file "${rel}"`);
            } else {
                vscode.window.showInformationMessage(`Emoji Eraser: file already excluded ("${rel}")`);
            }
        }),
        vscode.commands.registerCommand('emojiChecker.excludeAllWithSameExtension', async (resourceUri?: vscode.Uri) => {
            if (!resourceUri) return;
            const rel = getRelativePathForResource(resourceUri);
            const ext = getFileExtension(rel);
            if (!ext) {
                // No extension: fall back to excluding by file name.
                const fileName = rel.split('/').pop() || rel;
                const added = await addExcludePattern(fileName);
                if (added) {
                    vscode.window.showInformationMessage(`Emoji Eraser: excluded files named "${fileName}"`);
                } else {
                    vscode.window.showInformationMessage(`Emoji Eraser: pattern already present ("${fileName}")`);
                }
                return;
            }

            // Users want to type "*.rs" etc. Our matcher expands this to apply anywhere.
            const pattern = `*.${ext}`;
            const added = await addExcludePattern(pattern);
            if (added) {
                vscode.window.showInformationMessage(`Emoji Eraser: excluded all "${pattern}" files`);
            } else {
                vscode.window.showInformationMessage(`Emoji Eraser: pattern already present ("${pattern}")`);
            }
        }),
        vscode.commands.registerCommand('emojiChecker.excludeThisFolder', async (resourceUri?: vscode.Uri) => {
            if (!resourceUri) return;
            const rel = getRelativePathForResource(resourceUri);
            const pattern = rel.endsWith('/') ? `${rel}**` : `${rel}/**`;
            const added = await addExcludePattern(pattern);
            if (added) {
                vscode.window.showInformationMessage(`Emoji Eraser: excluded folder "${rel}"`);
            } else {
                vscode.window.showInformationMessage(`Emoji Eraser: folder already excluded ("${rel}")`);
            }
        }),
        vscode.commands.registerCommand(
            'emojiChecker.removeEmojisFromFiles',
            async (resourceUri?: vscode.Uri, selectedUris?: vscode.Uri[]) => {
                const targets = toSelectedFileUris(resourceUri, selectedUris);
                if (targets.length === 0) return;

                const label = targets.length === 1
                    ? getRelativePathForResource(targets[0])
                    : `${targets.length} files`;

                const choice = await vscode.window.showWarningMessage(
                    `Remove all emojis from ${label}?`,
                    { modal: true },
                    'Remove'
                );
                if (choice !== 'Remove') return;

                let changed = 0;
                for (const u of targets) {
                    try {
                        const didChange = await removeEmojisFromUri(u);
                        if (didChange) changed++;
                    } catch {
                        // Ignore individual failures; report summary below.
                    }
                }

                vscode.window.showInformationMessage(
                    changed > 0
                        ? `Emoji Eraser: removed emojis in ${changed}/${targets.length} file(s)`
                        : `Emoji Eraser: no emojis found in selected file(s)`
                );
            }
        )
    );

    // Code Action provider for quick fix on individual emojis
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { scheme: 'file' },
            {
                provideCodeActions(
                    document: vscode.TextDocument,
                    range: vscode.Range | vscode.Selection
                ): vscode.CodeAction[] | undefined {
                    const actions: vscode.CodeAction[] = [];
                    const diags = diagnostics.get(document.uri) || [];

                    for (const diag of diags) {
                        if (diag.range.intersection(range)) {
                            const fix = new vscode.CodeAction(
                                'Remove this emoji',
                                vscode.CodeActionKind.QuickFix
                            );
                            fix.edit = new vscode.WorkspaceEdit();
                            fix.edit.delete(document.uri, diag.range);
                            fix.diagnostics = [diag];
                            fix.isPreferred = true;
                            actions.push(fix);
                        }
                    }

                    return actions.length > 0 ? actions : undefined;
                }
            },
            { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
        )
    );
}

export function deactivate() {
    // no-op
}
