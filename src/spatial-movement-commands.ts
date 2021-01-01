import { TextEditor, TextEditorEdit } from "vscode"
import { SyntaxNode } from "web-tree-sitter"
import { EditorState } from "./editor-state"
import { EditorStateChange, logger } from "./extension"

// --- spatial movement functions (natural, planar)

function findNodeWithParentContainingLine(node: SyntaxNode, line: number): SyntaxNode | false {
    while (true) {
        if (!node.parent) {
            return false
        }
        if (node.parent.startPosition.row <= line || node.parent.endPosition.row >= line) {
            return node
        }
        node = node.parent
    }
}

export function nodeAbove(node: SyntaxNode, force = false): SyntaxNode | undefined {
    const targetLine = node.startPosition.row - 1
    // go up, until a parent contains the searched line
    const parent = findNodeWithParentContainingLine(node, targetLine)
    if (!parent) {
        return node
    }
    node = parent
    // search in siblings and their children
    while (true) {
        // traverse the siblings until we find the one, which contains the searched line
        while (node.startPosition.row > targetLine) {
            if (!node.previousNamedSibling) {
                // no more siblings left
                if (!force) return node
                while (node.parent && !node.previousNamedSibling) {
                    node = node.parent
                }
                return node.previousNamedSibling || node
            }
            node = node.previousNamedSibling
        }
        // we found a sibling containing our target line
        if (node.endPosition.row <= targetLine) {
            return node
        }
        // we found a sibling containing our target line, but it starts too early
        if (!node.lastNamedChild) {
            return node
        }
        node = node.lastNamedChild
    }
}

// find the next node which starts on the line below this one
// Will step outside of the bounds of this nodes parent if `force` is set.
export function nodeBelow(node: SyntaxNode, force = false): SyntaxNode | undefined {
    const targetLine = node.endPosition.row + 1
    // go up, until a parent contains the searched line
    const parent = findNodeWithParentContainingLine(node, targetLine)
    if (!parent) {
        return node
    }
    node = parent
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

export function moveUp(
    state: Readonly<EditorState>,
    _editor: TextEditor,
    _edit: TextEditorEdit,
    args?: { force?: boolean }
): EditorStateChange {
    return {
        currentNode: nodeAbove(state.currentNode, args?.force),
    }
}

export function moveDown(
    state: Readonly<EditorState>,
    _editor: TextEditor,
    _edit: TextEditorEdit,
    args?: { force?: boolean }
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
