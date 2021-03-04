// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { Point, SyntaxNode } from "web-tree-sitter"

// Examples for nodes which are pure whitespace: `text` nodes in HTML and line breaks in Markdown.
export function isPureWhitespace(node: SyntaxNode) {
    return node.text.trim() === ""
}

export function nextSibling(node: SyntaxNode, forward = true) {
    let next: SyntaxNode | null = node
    do {
        next = next[forward ? "nextNamedSibling" : "previousNamedSibling"]
    } while (next && isPureWhitespace(next))
    return next
}

export function previousSibling(node: SyntaxNode) {
    return nextSibling(node, false)
}

export function nextChild(node: SyntaxNode, forward = true) {
    return node[forward ? "firstNamedChild" : "lastNamedChild"]
}

export function lastChild(node: SyntaxNode) {
    return nextChild(node, false)
}

/** A Tree-sitter `Range`, but without `startIndex` and `endIndex`. */
export type SimpleRange = { startPosition: Point; endPosition: Point }

/** Tests whether the `other` node is inside of this `node`. */
export function contains(node: SimpleRange, other: SimpleRange): boolean {
    return (
        // beginning
        (node.startPosition.row < other.startPosition.row ||
            // on same row
            (node.startPosition.row === other.startPosition.row &&
                node.startPosition.column <= other.startPosition.column)) &&
        // and end
        (node.endPosition.row > other.endPosition.row ||
            // on same row
            (node.endPosition.row === other.endPosition.row &&
                node.endPosition.column >= other.endPosition.column))
    )
}
