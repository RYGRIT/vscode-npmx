import type { CompletionItemProvider, Position, TextDocument } from 'vscode'
import { getResolvedDependencyByOffset, getWorkspaceContext } from '#core/workspace'
import { offsetRangeToRange } from '#utils/ast'
import { CompletionItem, CompletionItemKind } from 'vscode'

export class CatalogCompletionItemProvider implements CompletionItemProvider {
  static triggers = [':']

  async provideCompletionItems(document: TextDocument, position: Position) {
    const offset = document.offsetAt(position)
    const info = await getResolvedDependencyByOffset(document.uri, offset)
    if (!info?.rawSpec.startsWith('catalog:'))
      return

    const ctx = await getWorkspaceContext(document.uri)
    if (!ctx)
      return

    const catalogs = await ctx.getCatalogs()

    if (!catalogs)
      return

    const items: CompletionItem[] = []

    for (const name in catalogs) {
      const item = new CompletionItem(name, CompletionItemKind.EnumMember)

      item.insertText = name

      items.push(item)
    }

    return items
  }
}
