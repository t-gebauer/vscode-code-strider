// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

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
