import {
  PACKAGE_JSON_BASENAME,
  PACKAGE_JSON_PATTERN,
  PNPM_WORKSPACE_BASENAME,
  PNPM_WORKSPACE_PATTERN,
  VERSION_TRIGGER_CHARACTERS,
} from '#constants'
import { defineExtension } from 'reactive-vscode'
import { languages } from 'vscode'
import { PackageJsonExtractor } from './extractors/package-json'
import { PnpmWorkspaceYamlExtractor } from './extractors/pnpm-workspace-yaml'
import { displayName, version } from './generated-meta'
import { VersionCompletionItemProvider } from './providers/completion-item/version'
import { registerDiagnosticCollection } from './providers/diagnostics'
import { NpmxHoverProvider } from './providers/hover/npmx'
import { config, logger } from './state'

export const { activate, deactivate } = defineExtension((ctx) => {
  logger.info(`${displayName} Activated, v${version}`)

  const packageJsonExtractor = new PackageJsonExtractor()
  const pnpmWorkspaceYamlExtractor = new PnpmWorkspaceYamlExtractor()

  ctx.subscriptions.push(
    languages.registerHoverProvider(
      { pattern: PACKAGE_JSON_PATTERN },
      new NpmxHoverProvider(packageJsonExtractor),
    ),
    languages.registerHoverProvider(
      { pattern: PNPM_WORKSPACE_PATTERN },
      new NpmxHoverProvider(pnpmWorkspaceYamlExtractor),
    ),
  )

  if (config.versionCompletion !== 'off') {
    ctx.subscriptions.push(
      languages.registerCompletionItemProvider(
        { pattern: PACKAGE_JSON_PATTERN },
        new VersionCompletionItemProvider(packageJsonExtractor),
        ...VERSION_TRIGGER_CHARACTERS,
      ),
      languages.registerCompletionItemProvider(
        { pattern: PNPM_WORKSPACE_PATTERN },
        new VersionCompletionItemProvider(pnpmWorkspaceYamlExtractor),
        ...VERSION_TRIGGER_CHARACTERS,
      ),
    )
  }

  registerDiagnosticCollection({
    [PACKAGE_JSON_BASENAME]: packageJsonExtractor,
    [PNPM_WORKSPACE_BASENAME]: pnpmWorkspaceYamlExtractor,
  })
})
