export type SemverTuple = [number, number, number]

export function parseSemverTuple(version: string): SemverTuple | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match)
    return null

  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export type UpdateType = 'major' | 'minor' | 'patch' | 'prerelease' | 'none'

export interface VersionUpgradeOptions {
  major?: string
  minor?: string
  patch?: string
  prerelease?: string
  latest: string
}

export function getUpgradeOptions(current: string, allVersions: string[], latestTag: string): VersionUpgradeOptions {
  const currentTuple = parseSemverTuple(current)
  if (!currentTuple)
    return { latest: latestTag }

  const [curMajor, curMinor, curPatch] = currentTuple
  let maxPatch: string | undefined
  let maxMinor: string | undefined
  let maxMajor: string | undefined

  for (const ver of allVersions) {
    const tuple = parseSemverTuple(ver)
    if (!tuple)
      continue

    const [vMajor, vMinor, vPatch] = tuple

    if (ver.includes('-'))
      continue

    if (vMajor === curMajor && vMinor === curMinor && vPatch > curPatch) {
      if (!maxPatch || compare(ver, maxPatch) > 0) {
        maxPatch = ver
      }
    }

    if (vMajor === curMajor && vMinor > curMinor) {
      if (!maxMinor || compare(ver, maxMinor) > 0) {
        maxMinor = ver
      }
    }

    if (vMajor > curMajor) {
      if (!maxMajor || compare(ver, maxMajor) > 0) {
        maxMajor = ver
      }
    }
  }

  const result: VersionUpgradeOptions = { latest: latestTag }

  if (latestTag !== current) {
    if (maxPatch && maxPatch !== latestTag)
      result.patch = maxPatch
    if (maxMinor && maxMinor !== latestTag)
      result.minor = maxMinor
    if (maxMajor && maxMajor !== latestTag)
      result.major = maxMajor
  }

  if (latestTag.includes('-') && !current.includes('-')) {
    result.prerelease = latestTag
  }

  return result
}

function compare(v1: string, v2: string): number {
  const t1 = parseSemverTuple(v1)!
  const t2 = parseSemverTuple(v2)!

  if (t1[0] !== t2[0])
    return t1[0] - t2[0]
  if (t1[1] !== t2[1])
    return t1[1] - t2[1]
  return t1[2] - t2[2]
}
