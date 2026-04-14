import type { DependencyInfo } from 'npmx-language-core/workspace'

export function mergeResolvedDependencies(
  manifestDependencies?: DependencyInfo[],
  workspaceDependencies?: DependencyInfo[],
): DependencyInfo[] | undefined {
  if (manifestDependencies && workspaceDependencies)
    return [...manifestDependencies, ...workspaceDependencies]

  return manifestDependencies ?? workspaceDependencies
}
