import type { DependencyInfo, Extractor } from '#types/extractor'
import type { VersionUpgradeOptions } from '#utils/semver'
import type { CodeLensProvider, Range, TextDocument } from 'vscode'
import { getPackageInfo } from '#utils/api/package'
import { getUpgradeOptions } from '#utils/semver'
import { formatVersion, isSupportedProtocol, parseVersion } from '#utils/version'
import { debounce } from 'perfect-debounce'
import { CodeLens, EventEmitter } from 'vscode'
import { commands } from '../../generated-meta'

type UpgradeType = keyof VersionUpgradeOptions

interface LensData {
  dep: DependencyInfo
  versionRange: Range
  uri: TextDocument['uri']
  state:
    | { kind: 'pending' }
    | { kind: 'unknown' }
    | { kind: 'upgrade', upgradeType: UpgradeType, targetVersion: string, newVersion: string }
}

const upgradeLabels: Record<UpgradeType, string> = {
  latest: 'latest',
  major: 'major',
  minor: 'minor',
  patch: 'patch',
  prerelease: 'pre',
}

const upgradeOrder: UpgradeType[] = ['latest', 'major', 'minor', 'patch', 'prerelease']

const dataMap = new WeakMap<CodeLens, LensData>()

export class VersionCodeLensProvider<T extends Extractor> implements CodeLensProvider {
  extractor: T
  private readonly onDidChangeCodeLensesEmitter = new EventEmitter<void>()
  readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event
  private readonly scheduleRefresh = debounce(() => {
    this.onDidChangeCodeLensesEmitter.fire()
  }, 100, { leading: false, trailing: true })

  constructor(extractor: T) {
    this.extractor = extractor
  }

  provideCodeLenses(document: TextDocument): CodeLens[] {
    const root = this.extractor.parse(document)
    if (!root)
      return []

    const deps = this.extractor.getDependenciesInfo(root)
    const lenses: CodeLens[] = []

    for (const dep of deps) {
      const parsed = parseVersion(dep.version)
      if (!parsed || !isSupportedProtocol(parsed.protocol))
        continue

      const versionRange = this.extractor.getNodeRange(document, dep.versionNode)
      const uri = document.uri

      const pkg = getPackageInfo(dep.name)

      if (pkg instanceof Promise) {
        const lens = new CodeLens(versionRange)
        dataMap.set(lens, { dep, versionRange, uri, state: { kind: 'pending' } })
        lenses.push(lens)
        pkg.finally(() => this.scheduleRefresh())
        continue
      }

      const latest = pkg?.distTags.latest
      if (!latest) {
        const lens = new CodeLens(versionRange)
        dataMap.set(lens, { dep, versionRange, uri, state: { kind: 'unknown' } })
        lenses.push(lens)
        continue
      }

      const allVersions = Object.keys(pkg.versionsMeta || {})
      const upgradeOptions = getUpgradeOptions(parsed.semver, allVersions, latest)

      for (const type of upgradeOrder) {
        const targetVersion = type === 'latest'
          ? (upgradeOptions.latest !== parsed.semver ? upgradeOptions.latest : undefined)
          : upgradeOptions[type]

        if (!targetVersion)
          continue

        const newVersion = formatVersion({ ...parsed, semver: targetVersion })
        const lens = new CodeLens(versionRange)
        dataMap.set(lens, { dep, versionRange, uri, state: { kind: 'upgrade', upgradeType: type, targetVersion, newVersion } })
        lenses.push(lens)
      }
    }

    return lenses
  }

  resolveCodeLens(lens: CodeLens): CodeLens {
    const data = dataMap.get(lens)
    if (!data)
      return lens

    const { versionRange, uri, state } = data

    switch (state.kind) {
      case 'pending':
        lens.command = { title: '$(sync~spin) checking...', command: '' }
        break
      case 'unknown':
        lens.command = { title: '$(question) unknown', command: '' }
        break
      case 'upgrade':
        lens.command = {
          title: `$(arrow-up) ${upgradeLabels[state.upgradeType]} ${state.targetVersion}`,
          command: commands.updateVersion,
          arguments: [uri, versionRange, state.newVersion],
        }
        break
    }

    return lens
  }
}
