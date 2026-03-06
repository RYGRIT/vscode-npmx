import { describe, expect, it } from 'vitest'
import { encodePackageName, getMaxSatisfying, resolveExactVersion } from '../../src/utils/package'

describe('encodePackageName', () => {
  it('should encode regular package name', () => {
    expect(encodePackageName('lodash')).toBe('lodash')
  })

  it('should encode scoped package name', () => {
    expect(encodePackageName('@vue/core')).toBe('@vue%2Fcore')
  })
})

describe('resolveExactVersion', () => {
  it('should respect dist tags directly', () => {
    const pkg = {
      distTags: {
        latest: '4.10.0',
        next: '4.11.0-beta.1',
      },
      versionsMeta: {
        '4.10.0': {},
        '4.10.1': {},
        '4.11.0-beta.1': {},
      },
    } as any

    expect(resolveExactVersion(pkg, 'latest')).toBe('4.10.0')
    expect(resolveExactVersion(pkg, 'next')).toBe('4.11.0-beta.1')
  })

  it('should not resolve beyond latest when a newer matching version exists', () => {
    const pkg = {
      distTags: {
        latest: '4.10.0',
      },
      versionsMeta: {
        '4.10.0': {},
        '4.10.1': {
          deprecated: 'Unplanned Release',
        },
      },
    } as any

    expect(resolveExactVersion(pkg, '^4.10.0')).toBe('4.10.0')
  })
})

describe('getMaxSatisfying', () => {
  it('should return undefined for wildcard and empty ranges', () => {
    expect(getMaxSatisfying(['1.0.0'], '*', { latest: '1.0.0' })).toBeNull()
    expect(getMaxSatisfying(['1.0.0'], '   ', { latest: '1.0.0' })).toBeNull()
  })

  it('should return null for invalid ranges', () => {
    expect(getMaxSatisfying(['1.0.0'], 'workspace:*', { latest: '1.0.0' })).toBeNull()
  })

  it('should fall back to the highest satisfying version when latest does not satisfy the range', () => {
    expect(getMaxSatisfying(['1.0.0', '1.1.0', '2.0.0'], '^1.0.0', { latest: '2.0.0' })).toBe('1.1.0')
  })

  it('should handle missing latest tag gracefully', () => {
    expect(getMaxSatisfying(['1.0.0', '1.1.0'], '^1.0.0', {})).toBe('1.1.0')
  })

  it('should return null when no versions are available', () => {
    expect(getMaxSatisfying([], '^1.0.0', { latest: '1.0.0' })).toBeNull()
  })

  it('should return null when the range has no matching version', () => {
    expect(getMaxSatisfying(['1.0.0'], '^2.0.0', { latest: '1.0.0' })).toBeNull()
  })
})
