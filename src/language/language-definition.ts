import { SyntaxNode } from "web-tree-sitter"

export type NodeAccessorFunction = (node: SyntaxNode) => SyntaxNode | null | undefined

export type LanguageDefinition = {
    languageId: string
}

export function defineLanguage(languageId: string): LanguageDefinition {
    return { languageId }
}
