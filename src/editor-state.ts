import { TextEditor } from "vscode";
import { SyntaxNode } from "web-tree-sitter";
import Parser = require("web-tree-sitter");

export interface EditorState {
    editor: TextEditor,
    currentNode: SyntaxNode;
    insertMode: Boolean;
    parseTree: Parser.Tree;
}
