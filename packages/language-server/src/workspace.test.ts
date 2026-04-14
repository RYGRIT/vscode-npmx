import type { DependencyInfo } from 'npmx-language-core/workspace'
import { describe, expect, it } from 'vitest'
import { mergeResolvedDependencies } from './merge-resolved-dependencies'

function createDependency(rawName: string): DependencyInfo {
  return {
    category: 'dependencies',
    nameRange: [0, rawName.length],
    packageInfo: async () => null,
    protocol: null,
    rawName,
    rawSpec: '^1.0.0',
    resolvedName: rawName,
    resolvedProtocol: 'npm',
    resolvedSpec: '^1.0.0',
    resolvedVersion: async () => null,
    specRange: [rawName.length + 1, rawName.length + 7],
  }
}

describe('mergeResolvedDependencies', () => {
  it('merges manifest and workspace dependencies for bun root package.json files', () => {
    const manifestDependencies = [createDependency('lodash')]
    const workspaceDependencies = [createDependency('semver')]

    expect(mergeResolvedDependencies(manifestDependencies, workspaceDependencies))
      .toEqual([...manifestDependencies, ...workspaceDependencies])
  })

  it('returns whichever dependency set is available', () => {
    const manifestDependencies = [createDependency('lodash')]
    const workspaceDependencies = [createDependency('semver')]

    expect(mergeResolvedDependencies(manifestDependencies, undefined)).toEqual(manifestDependencies)
    expect(mergeResolvedDependencies(undefined, workspaceDependencies)).toEqual(workspaceDependencies)
  })
})
