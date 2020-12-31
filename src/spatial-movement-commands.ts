import { TextEditor, TextEditorEdit } from "vscode"
import { SyntaxNode } from "web-tree-sitter"
import { EditorState } from "./editor-state"
import { EditorStateChange, logger } from "./extension"

// --- spatial movement functions (natural, planar)

function nodeAbove(node: SyntaxNode): SyntaxNode | undefined {
    const other = node.previousNamedSibling
    if (other && other.endPosition.row < node.startPosition.row) {
        return other
    }
    return node.parent || undefined
}

// find the next node which starts on the line below this one
// Will step outside of the bounds of this nodes parent if `force` is set.
export function nodeBelow(node: SyntaxNode, force = false): SyntaxNode | undefined {
    const targetLine = node.endPosition.row + 1
    // go up, until a parent contains the searched line
    while (true) {
        if (!node.parent) {
            return node
        }
        if (node.parent.endPosition.row >= targetLine) {
            break
        }
        node = node.parent
    }
    // search in siblings and their children
    while (true) {
        // traverse the siblings until we find the one, which contains the searched line
        while (node.endPosition.row < targetLine) {
            if (!node.nextNamedSibling) {
                // no more siblings left
                if (!force) return node
                while (node.parent && !node.nextNamedSibling) {
                    node = node.parent
                }
                return node.nextNamedSibling || node
            }
            node = node.nextNamedSibling
        }
        // we found a sibling containing our target line
        if (node.startPosition.row >= targetLine) {
            return node
        }
        // we found a sibling containing our target line, but it starts too early
        if (!node.firstNamedChild) {
            return node
        }
        node = node.firstNamedChild
    }
}

function nodeLeftOf(node: SyntaxNode): SyntaxNode | undefined {
    const other = node.previousNamedSibling
    if (other && other.endPosition.row === node.startPosition.row) {
        return other
    }
    return node.parent || undefined
}

function nodeRightOf(node: SyntaxNode): SyntaxNode | undefined {
    const other = node.nextNamedSibling
    if (!other) {
        return node.parent || undefined
    }
    if (other.startPosition.row === node.endPosition.row) {
        return other
    }
    return nodeRightOf(other)
}

export function moveUp(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: nodeAbove(state.currentNode),
    }
}

export function moveDown(
    state: Readonly<EditorState>,
    _editor: TextEditor,
    _edit: TextEditorEdit,
    args?: {force?: boolean}
): EditorStateChange {
    return {
        currentNode: nodeBelow(state.currentNode, args?.force),
    }
}

export function moveLeft(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: nodeLeftOf(state.currentNode),
    }
}

export function moveRight(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: nodeRightOf(state.currentNode),
    }
}
