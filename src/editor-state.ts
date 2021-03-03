// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { TextEditor } from "vscode"
import { SyntaxNode } from "web-tree-sitter"
import Parser = require("web-tree-sitter")

export interface EditorState {
    editor: TextEditor
    insertMode: Boolean
    currentNode: SyntaxNode
    previousNodes: Array<SyntaxNode>
    parseTree: Parser.Tree
}
