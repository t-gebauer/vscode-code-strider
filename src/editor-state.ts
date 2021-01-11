import { TextEditor } from "vscode"
import { SyntaxNode } from "web-tree-sitter"
import Parser = require("web-tree-sitter")

export interface EditorState {
    editor: TextEditor
    insertMode: Boolean
    currentNode: SyntaxNode
    previousNodes: Array<SyntaxNode>
    selectionAnchor?:  SyntaxNode
    parseTree: Parser.Tree
}
