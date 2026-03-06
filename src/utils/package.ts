import type { PackageInfo } from './api/package'
import semver from 'semver'

/**
 * Encode a package name for use in npm registry URLs.
 * Handles scoped packages (e.g., @scope/name -> @scope%2Fname).
 */
export function encodePackageName(name: string): string {
  if (name.startsWith('@')) {
    return `@${encodeURIComponent(name.slice(1))}`
  }
  return encodeURIComponent(name)
}

export function formatPackageId(name: string, version: string): string {
  return `${name}@${version}`
}

export function resolveExactVersion(pkg: PackageInfo, version: string) {
  if (Object.hasOwn(pkg.distTags, version))
    return pkg.distTags[version]

  return getMaxSatisfying(Object.keys(pkg.versionsMeta), version, pkg.distTags) ?? null
}

/**
 * Resolve the maximum version satisfying the given range, capped by the `latest` dist-tag when possible.
 *
 * This first reads the `latest` tag, then selects the highest version that satisfies the range
 * without exceeding that `latest` version.
 *
 * Inspired by:
 * https://github.com/antfu-collective/taze/blob/fed751d777620ddb0a0e77a05ea1412f6332d043/src/utils/versions.ts#L66-L104
 */
export function getMaxSatisfying(versions: string[], current: string, tags: Record<string, string>) {
  let version: string | null = null
  let maxVersion: string | null = tags.latest

  if (current === '*' || current.trim() === '')
    return

  if (!semver.validRange(current))
    return null

  if (!maxVersion || !semver.valid(maxVersion) || !semver.satisfies(maxVersion, current))
    maxVersion = null

  for (const ver of versions) {
    if (semver.satisfies(ver, current)) {
      if (!maxVersion || semver.lte(ver, maxVersion)) {
        if (!version || semver.gt(ver, version)) {
          version = ver
        }
      }
    }
  }
  return version
}
