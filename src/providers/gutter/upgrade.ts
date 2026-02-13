import type { Extractor } from '#types/extractor'
import type { VersionUpgradeOptions } from '#utils/semver'
import type { DecorationOptions, TextEditor, Uri } from 'vscode'
import { getPackageInfo } from '#utils/api/package'
import { getUpgradeOptions } from '#utils/semver'
import { formatVersion, isSupportedProtocol, parseVersion } from '#utils/version'
import { debounce } from 'perfect-debounce'
import { MarkdownString, ThemeColor, window } from 'vscode'
import { commands } from '../../generated-meta'

type UpgradeType = keyof VersionUpgradeOptions

const upgradeLabels: Record<UpgradeType, string> = {
  latest: 'latest',
  major: 'major',
  minor: 'minor',
  patch: 'patch',
  prerelease: 'pre',
}

const upgradeOrder: UpgradeType[] = ['latest', 'major', 'minor', 'patch', 'prerelease']

export class UpgradeGutterProvider<T extends Extractor> {
  private readonly extractor: T
  private readonly gutterDecorationType: ReturnType<typeof window.createTextEditorDecorationType>
  private readonly inlineDecorationType: ReturnType<typeof window.createTextEditorDecorationType>

  private pendingRefresh = false

  constructor(extractor: T, extensionUri: Uri) {
    this.extractor = extractor
    this.gutterDecorationType = window.createTextEditorDecorationType({
      gutterIconPath: extensionUri.with({ path: `${extensionUri.path}/res/gutter-upgrade.svg` }),
      gutterIconSize: 'contain',
    })
    this.inlineDecorationType = window.createTextEditorDecorationType({
      after: {
        color: new ThemeColor('editorCodeLens.foreground'),
        margin: '0 0 0 1em',
      },
    })
  }

  readonly update = debounce((editor: TextEditor) => {
    this._update(editor)
  }, 200, { leading: false, trailing: true })

  private _update(editor: TextEditor): void {
    const document = editor.document
    const root = this.extractor.parse(document)
    if (!root) {
      editor.setDecorations(this.gutterDecorationType, [])
      editor.setDecorations(this.inlineDecorationType, [])
      return
    }

    const deps = this.extractor.getDependenciesInfo(root)
    const gutterDecorations: DecorationOptions[] = []
    const inlineDecorations: DecorationOptions[] = []
    this.pendingRefresh = false

    for (const dep of deps) {
      const parsed = parseVersion(dep.version)
      if (!parsed || !isSupportedProtocol(parsed.protocol))
        continue

      const pkg = getPackageInfo(dep.name)

      if (pkg instanceof Promise) {
        this.pendingRefresh = true
        pkg.finally(() => {
          if (this.pendingRefresh)
            this.update(editor)
        })
        continue
      }

      const latest = pkg?.distTags.latest
      if (!latest)
        continue

      const allVersions = Object.keys(pkg.versionsMeta || {})
      const upgradeOptions = getUpgradeOptions(parsed.semver, allVersions, latest)

      const items: { type: UpgradeType, targetVersion: string, newVersion: string }[] = []

      for (const type of upgradeOrder) {
        const targetVersion = type === 'latest'
          ? (upgradeOptions.latest !== parsed.semver ? upgradeOptions.latest : undefined)
          : upgradeOptions[type]

        if (!targetVersion)
          continue

        items.push({
          type,
          targetVersion,
          newVersion: formatVersion({ ...parsed, semver: targetVersion }),
        })
      }

      if (!items.length)
        continue

      const versionRange = this.extractor.getNodeRange(document, dep.versionNode)

      const md = new MarkdownString('', true)
      md.isTrusted = true

      for (const item of items) {
        const args = encodeURIComponent(JSON.stringify([document.uri, versionRange, item.newVersion]))
        md.appendMarkdown(`[$(arrow-up) ${upgradeLabels[item.type]} ${item.targetVersion}](command:${commands.updateVersion}?${args})  \n`)
      }

      gutterDecorations.push({
        range: versionRange,
        hoverMessage: md,
      })

      const latestItem = items[0]
      inlineDecorations.push({
        range: versionRange,
        hoverMessage: md,
        renderOptions: {
          after: {
            contentText: `↑ ${upgradeLabels[latestItem.type]} ${latestItem.targetVersion}`,
          },
        },
      })
    }

    editor.setDecorations(this.gutterDecorationType, gutterDecorations)
    editor.setDecorations(this.inlineDecorationType, inlineDecorations)
  }

  dispose(): void {
    this.gutterDecorationType.dispose()
    this.inlineDecorationType.dispose()
  }
}
