import { TextEditor, TextEditorEdit } from "vscode"
import { SyntaxNode } from "web-tree-sitter"
import { EditorState } from "./editor-state"
import { EditorStateChange } from "./extension"

// --- spatial movement functions (natural, planar)

function findNodeWithParentContainingLine(
    node: SyntaxNode,
    line: number,
    forward = true
): SyntaxNode | false {
    while (true) {
        if (!node.parent) {
            return false
        }
        if (forward ? node.parent.endPosition.row >= line : node.parent.startPosition.row <= line) {
            return node
        }
        node = node.parent
    }
}

function nextSibling(node: SyntaxNode, forward = true) {
    return node[forward ? "nextNamedSibling" : "previousNamedSibling"]
}

function nextChild(node: SyntaxNode, forward = true) {
    return node[forward ? "firstNamedChild" : "lastNamedChild"]
}

function findSiblingContainingLine(
    node: SyntaxNode,
    line: number,
    forward = true
): SyntaxNode | false {
    while (forward ? node.endPosition.row < line : node.startPosition.row > line) {
        const sibling = nextSibling(node, forward)
        if (!sibling) {
            return false
        }
        node = sibling
    }
    return node
}

function findNextSiblingOfParent(node: SyntaxNode, forward = true): SyntaxNode {
    while (node.parent && !nextSibling(node, forward)) {
        node = node.parent
    }
    return nextSibling(node, forward) || node
}

// Find the next node which starts on the line below|above this one
// Will step outside of the bounds of this nodes parent if `force` is set.
function nextNode(node: SyntaxNode, forward = true, force = false): SyntaxNode | undefined {
    const targetLine = forward ? node.endPosition.row + 1 : node.startPosition.row - 1
    // go up, until a parent contains the searched line
    const parent = findNodeWithParentContainingLine(node, targetLine, forward)
    if (!parent) {
        return node
    }
    node = parent
    // search in siblings and their children
    while (true) {
        const sibling = findSiblingContainingLine(node, targetLine, forward)
        if (!sibling) {
            return force ? findNextSiblingOfParent(node, forward) : node
        }
        node = sibling
        // We found a sibling containing our target line
        if (forward ? node.startPosition.row >= targetLine : node.endPosition.row <= targetLine) {
            return node
        }
        // we found a sibling containing our target line, but it (starts too early|ends too late)
        const child = nextChild(node, forward)
        if (!child) {
            return node
        }
        node = child
    }
}

export function nodeAbove(node: SyntaxNode, force = false): SyntaxNode | undefined {
    return nextNode(node, false, force)
}

export function nodeBelow(node: SyntaxNode, force = false): SyntaxNode | undefined {
    return nextNode(node, true, force)
}

export function nodeLeftOf(node: SyntaxNode): SyntaxNode | undefined {
    const other = node.previousNamedSibling
    if (other && other.endPosition.row === node.startPosition.row) {
        return other
    }
    return node.parent || undefined
}

export function nodeRightOf(node: SyntaxNode): SyntaxNode | undefined {
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
