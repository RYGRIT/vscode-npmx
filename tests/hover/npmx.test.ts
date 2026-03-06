import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Position } from 'vscode'
import { NpmxHoverProvider } from '../../src/providers/hover/npmx'

const { getPackageInfo } = vi.hoisted(() => ({
  getPackageInfo: vi.fn(),
}))

vi.mock('#utils/api/package', () => ({
  getPackageInfo,
}))

describe('npmx hover provider', () => {
  beforeEach(() => {
    getPackageInfo.mockReset()
  })

  it('should not show provenance from versions newer than latest', async () => {
    getPackageInfo.mockResolvedValue({
      distTags: {
        latest: '4.10.0',
      },
      versionsMeta: {
        '4.10.0': {},
        '4.10.1': {
          provenance: true,
        },
      },
    })

    const extractor = {
      parse: vi.fn().mockReturnValue({}),
      getDependencyInfoByOffset: vi.fn().mockReturnValue({
        name: '@azure/keyvault-secrets',
        version: '^4.10.0',
      }),
    }

    const provider = new NpmxHoverProvider(extractor as any)
    const document = {
      offsetAt: vi.fn().mockReturnValue(0),
    }

    const hover = await provider.provideHover(document as any, new Position(0, 0))

    expect(getPackageInfo).toHaveBeenCalledWith('@azure/keyvault-secrets')
    expect(hover).toBeDefined()
    expect((hover as any).contents.value).not.toContain('Verified provenance')
    expect((hover as any).contents.value).toContain('https://npmx.dev/package/@azure/keyvault-secrets')
  })
})
