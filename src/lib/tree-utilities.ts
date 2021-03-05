// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { Edit, Point, SyntaxNode, Tree } from "web-tree-sitter"
import { SimpleRange } from "./interop"
import { contains } from "./node-utilities"

/** Find the outmost node which is completely contained in the selection */
export function findNodeAtSelection(tree: Tree, selection: SimpleRange): SyntaxNode {
    // Start at the top. Walk down until the we find the last node which completely contains the selection.
    const cursor = tree.walk()

    // For all nodes
    while (true) {
        // We know that this node completely contains the selection.
        // Does one of the child nodes completely contain the selection?
        if (!cursor.gotoFirstChild()) {
            return cursor.currentNode()
        }
        // For all children
        while (true) {
            if (cursor.nodeIsNamed && contains(cursor, selection)) {
                break
            }
            if (!cursor.gotoNextSibling()) {
                // None of the siblings contain the complete selection
                cursor.gotoParent()
                return cursor.currentNode()
            }
        }
    }
}

/** Find a node on the same row as the given point, or earlier */
// FIXME: should not select concrete syntax (e.g. `}` in TypeScript)
export function findNodeBeforeCursor(tree: Tree, point: Point): SyntaxNode {
    const cursor = tree.walk()

    // move past the position, then step back
    while (true) {
        if (!cursor.gotoFirstChild()) {
            return cursor.currentNode()
        }

        // iterate through all siblings on this level
        while (true) {
            if (
                point.row > cursor.endPosition.row ||
                (point.row === cursor.endPosition.row && point.column > cursor.endPosition.column)
            ) {
                // needle is after current node
                // -> go to next node
                if (!cursor.gotoNextSibling()) {
                    // FIXME: when does this happen? If the position is invalid?
                    return cursor.currentNode()
                }
            } else if (
                point.row < cursor.startPosition.row ||
                (point.row === cursor.startPosition.row &&
                    point.column < cursor.startPosition.column)
            ) {
                // needle is before current node
                const node = cursor.currentNode()
                const previousNode = node.previousSibling
                if (!previousNode) {
                    // this is the first child
                    cursor.gotoParent()
                    return cursor.currentNode()
                }
                if (point.row === cursor.startPosition.row) {
                    // this node is on the same row
                    if (previousNode.endPosition.row === point.row) {
                        // the previous node is also on the same row
                        return previousNode
                    }
                    return cursor.currentNode()
                }
                return previousNode
            } else {
                // needle is inside current node
                // -> check children, or return this node
                break
            }
        }
    }
}

export function composeTreeEdit(
    range: SimpleRange,
    rangeOffset: number,
    rangeLength: number,
    text: string
): Edit {
    // Let's just assume that end-of-line sequences are normalized
    const newLines = text.split("\n")
    return {
        startIndex: rangeOffset,
        oldEndIndex: rangeOffset + rangeLength,
        newEndIndex: rangeOffset + text.length,
        startPosition: range.startPosition,
        oldEndPosition: range.endPosition,
        newEndPosition: {
            row: range.startPosition.row + newLines.length - 1,
            column:
                newLines.length > 1
                    ? newLines[newLines.length - 1].length
                    : range.startPosition.column + text.length,
        },
    }
}
