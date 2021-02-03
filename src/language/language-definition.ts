import { SyntaxNode } from "web-tree-sitter"

export type NodeAccessorFunction = (node: SyntaxNode) => SyntaxNode | null | undefined

export type LanguageDefinition = {
    // vscode language id
    id: string
    // tree-sitter grammar id
    grammarId: string
}

export function defineLanguage(languageId: string, grammarId?: string): LanguageDefinition {
    return {
        id: languageId,
        grammarId: grammarId ?? languageId,
    }
}
