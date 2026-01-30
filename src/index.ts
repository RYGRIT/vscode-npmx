import { PACKAGE_JSON_PATTERN } from '#constants'
import { defineExtension } from 'reactive-vscode'
import { languages } from 'vscode'
import { JsonExtractor } from './extractors/json'
import { displayName, version } from './generated-meta'
import { triggerChars, VersionCompletionItemProvider } from './providers/completion-item/version'
import { NpmxDocumentLinkProvider } from './providers/document-link/npmx'
import { config, logger } from './state'

export const { activate, deactivate } = defineExtension((ctx) => {
  logger.info(`${displayName} Activated, v${version}`)

  const jsonExtractor = new JsonExtractor()

  ctx.subscriptions.push(
    languages.registerDocumentLinkProvider(
      { pattern: PACKAGE_JSON_PATTERN },
      new NpmxDocumentLinkProvider(jsonExtractor),
    ),
  )

  if (config.versionCompletion !== 'off') {
    ctx.subscriptions.push(
      languages.registerCompletionItemProvider(
        { pattern: PACKAGE_JSON_PATTERN },
        new VersionCompletionItemProvider(jsonExtractor),
        ...triggerChars,
      ),
    )
  }
})
