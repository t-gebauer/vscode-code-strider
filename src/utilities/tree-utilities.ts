import { Position, Selection } from "vscode"
import { SyntaxNode, Tree } from "web-tree-sitter"
import { toRange } from "./conversion-utilities"

export function findNodeAtSelection(tree: Tree, selection: Selection): SyntaxNode {
    // Start at the top. Walk down until the we find the last node which completely contains the selection.
    const cursor = tree.walk()

    // TODO: Improvement: If whitespace is selected between nodes:
    //       Select the node before the space instead of the parent?

    // For all nodes
    while (true) {
        // We know that this node completely contains the selection.
        // Does one of the child nodes completely contain the selection?
        if (!cursor.gotoFirstChild()) {
            return cursor.currentNode()
        }
        // For all children
        while (true) {
            if (cursor.nodeIsNamed && toRange(cursor).contains(selection)) {
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
/** Find a node on the same line, or earlier */
export function findNodeBeforeCursor(tree: Tree, position: Position): SyntaxNode {
    const cursor = tree.walk()

    // move past the position, then step back
    while (true) {
        if (!cursor.gotoFirstChild()) {
            return cursor.currentNode()
        }

        // iterate through all siblings on this level
        while (true) {
            if (
                position.line > cursor.endPosition.row ||
                (position.line === cursor.endPosition.row &&
                    position.character > cursor.endPosition.column)
            ) {
                // needle is after current node
                // -> go to next node
                if (!cursor.gotoNextSibling()) {
                    // this node is the last sibling
                    throw Error("Could not find node before cursor. Is this algorithm defect?")
                }
            } else if (
                position.line < cursor.startPosition.row ||
                (position.line === cursor.startPosition.row &&
                    position.character < cursor.startPosition.column)
            ) {
                // needle is before current node
                // TODO should we improve performance?
                const node = cursor.currentNode()
                const previousNode = node.previousSibling
                if (!previousNode) {
                    // this is the first child
                    cursor.gotoParent()
                    return cursor.currentNode()
                }
                if (position.line === cursor.startPosition.row) {
                    // this node is on the same line
                    if (previousNode.endPosition.row === position.line) {
                        // the previous node is also on the same line
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

