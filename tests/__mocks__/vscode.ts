import { createVSCodeMock } from 'jest-mock-vscode'
import { vi } from 'vitest'

const vscode = createVSCodeMock(vi)

export const {
  Uri,
  workspace,
  Range,
  Position,
  Location,
  Selection,
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Disposable,
  MarkdownString,
  CompletionItem,
  CompletionItemKind,
  CodeAction,
  CodeActionKind,
  WorkspaceEdit,
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticTag,
  window,
  languages,
} = vscode

export class Hover {
  contents: unknown

  constructor(contents: unknown) {
    this.contents = contents
  }
}

export class DocumentLink {
  range: unknown
  target?: unknown
  tooltip?: string

  constructor(range: unknown, target?: unknown) {
    this.range = range
    this.target = target
  }
}

export default vscode
