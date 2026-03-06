import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Range } from 'vscode'
import { NpmxDocumentLinkProvider } from '../../src/providers/document-link/npmx'

const { getPackageInfo, state } = vi.hoisted(() => ({
  getPackageInfo: vi.fn(),
  state: {
    config: { packageLinks: 'resolved' },
    logger: { warn: vi.fn() },
  },
}))

vi.mock('#utils/api/package', () => ({
  getPackageInfo,
}))

vi.mock('#state', () => state)

describe('npmx document link provider', () => {
  beforeEach(() => {
    getPackageInfo.mockReset()
    state.config.packageLinks = 'resolved'
    state.logger.warn.mockReset()
  })

  it('should resolve links using the latest-capped exact version', async () => {
    getPackageInfo.mockResolvedValue({
      distTags: {
        latest: '4.10.0',
      },
      versionsMeta: {
        '4.10.0': {},
        '4.10.1': {
          deprecated: 'Unplanned Release',
        },
      },
    })

    const dep = {
      name: '@azure/keyvault-secrets',
      version: '^4.10.0',
      nameNode: { offset: 0, length: 10 },
    }

    const extractor = {
      parse: vi.fn().mockReturnValue({}),
      getDependenciesInfo: vi.fn().mockReturnValue([dep]),
      getNodeRange: vi.fn().mockReturnValue(new Range(0, 0, 0, 10)),
    }

    const provider = new NpmxDocumentLinkProvider(extractor as any)
    const links = await provider.provideDocumentLinks({} as any)

    expect(getPackageInfo).toHaveBeenCalledWith('@azure/keyvault-secrets')
    expect(links).toHaveLength(1)
    expect(links[0]!.target?.toString()).toBe('https://npmx.dev/package/%40azure/keyvault-secrets/v/4.10.0')
    expect(links[0]!.tooltip).toBe('Open @azure/keyvault-secrets@4.10.0 on npmx')
  })
})
