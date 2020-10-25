import { Position, Range, Selection } from "vscode";
import { SyntaxNode } from "web-tree-sitter";

export function toSelection(node: SyntaxNode): Selection {
    return new Selection(
        new Position(node.startPosition.row, node.startPosition.column),
        new Position(node.endPosition.row, node.endPosition.column));
}

export function toRange(node: SyntaxNode): Range {
    return toSelection(node);
}