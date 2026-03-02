import type { ExtensionContext, Range, Uri } from 'vscode'
import { VERSION_TRIGGER_CHARACTERS } from '#constants'
import { debounce } from 'perfect-debounce'
import { defineExtension, useCommands, watchEffect } from 'reactive-vscode'
import { Disposable, languages, commands as vscodeCommands, window, workspace, WorkspaceEdit } from 'vscode'
import { openFileInNpmx } from './commands/open-file-in-npmx'
import { openInBrowser } from './commands/open-in-browser'
import { extractorEntries } from './extractors'
import { commands, displayName, version } from './generated-meta'
import { useCodeActions } from './providers/code-actions'
import { VersionCodeLensProvider } from './providers/code-lens/version'
import { VersionCompletionItemProvider } from './providers/completion-item/version'
import { useDiagnostics } from './providers/diagnostics'
import { UpgradeGutterProvider } from './providers/gutter/upgrade'
import { NpmxHoverProvider } from './providers/hover/npmx'
import { config, logger } from './state'

export const { activate, deactivate } = defineExtension((context: ExtensionContext) => {
  logger.info(`${displayName} Activated, v${version}`)

  watchEffect((onCleanup) => {
    if (!config.hover.enabled)
      return

    const disposables = extractorEntries.map(({ pattern, extractor }) =>
      languages.registerHoverProvider({ pattern }, new NpmxHoverProvider(extractor)),
    )

    onCleanup(() => Disposable.from(...disposables).dispose())
  })

  watchEffect((onCleanup) => {
    if (config.completion.version === 'off')
      return

    const disposables = extractorEntries.map(({ pattern, extractor }) =>
      languages.registerCompletionItemProvider(
        { pattern },
        new VersionCompletionItemProvider(extractor),
        ...VERSION_TRIGGER_CHARACTERS,
      ),
    )

    onCleanup(() => Disposable.from(...disposables).dispose())
  })

  watchEffect((onCleanup) => {
    if (!config.diagnostics.upgrade)
      return

    const provider = new UpgradeProvider()
    const options = { providedCodeActionKinds: [CodeActionKind.QuickFix] }
    const disposable = Disposable.from(
      languages.registerCodeActionsProvider({ pattern: PACKAGE_JSON_PATTERN }, provider, options),
      languages.registerCodeActionsProvider({ pattern: PNPM_WORKSPACE_PATTERN }, provider, options),
    )

    onCleanup(() => disposable.dispose())
  })

  watchEffect((onCleanup) => {
    if (!config.versionLens.enabled)
      return

    const disposables = [
      languages.registerCodeLensProvider(
        { pattern: PACKAGE_JSON_PATTERN },
        new VersionCodeLensProvider(packageJsonExtractor),
      ),
      languages.registerCodeLensProvider(
        { pattern: PNPM_WORKSPACE_PATTERN },
        new VersionCodeLensProvider(pnpmWorkspaceYamlExtractor),
      ),
    ]

    onCleanup(() => Disposable.from(...disposables).dispose())
  })

  watchEffect((onCleanup) => {
    if (!config.gutterIcon.enabled)
      return

    const packageJsonGutter = new UpgradeGutterProvider(packageJsonExtractor, context.extensionUri)
    const pnpmWorkspaceGutter = new UpgradeGutterProvider(pnpmWorkspaceYamlExtractor, context.extensionUri)

    function getProvider(document: { uri: { fsPath: string } }) {
      const fsPath = document.uri.fsPath
      if (fsPath.endsWith(PACKAGE_JSON_BASENAME))
        return packageJsonGutter
      if (fsPath.endsWith(PNPM_WORKSPACE_BASENAME))
        return pnpmWorkspaceGutter
      return null
    }

    function updateEditor(editor: typeof window.activeTextEditor) {
      if (!editor)
        return
      const provider = getProvider(editor.document)
      provider?.update(editor)
    }

    updateEditor(window.activeTextEditor)

    const disposables = [
      window.onDidChangeActiveTextEditor((editor) => {
        updateEditor(editor)
      }),
      workspace.onDidChangeTextDocument((e) => {
        const editor = window.activeTextEditor
        if (editor && editor.document === e.document) {
          const provider = getProvider(e.document)
          provider?.update(editor)
        }
      }),
      packageJsonGutter,
      pnpmWorkspaceGutter,
    ]

    onCleanup(() => Disposable.from(...disposables).dispose())
  })

  registerDiagnosticCollection({
    [PACKAGE_JSON_BASENAME]: packageJsonExtractor,
    [PNPM_WORKSPACE_BASENAME]: pnpmWorkspaceYamlExtractor,
  })

  useCommands({
    [commands.openInBrowser]: openInBrowser,
    [commands.openFileInNpmx]: openFileInNpmx,
    [commands.updateVersion]: debounce(async (uri: Uri, range: Range, newVersion: string) => {
      const edit = new WorkspaceEdit()
      edit.replace(uri, range, newVersion)
      await workspace.applyEdit(edit)
      vscodeCommands.executeCommand('editor.action.codeLens.refresh')
    }, 300, { leading: true, trailing: false }),
  })
})
